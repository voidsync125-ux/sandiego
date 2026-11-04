const fs = require('node:fs/promises')
const path = require('node:path')
const { MongoClient, GridFSBucket } = require('mongodb')

const dataDirectory = path.join(__dirname, 'data')
const databasePath = process.env.STORE_PATH || path.join(dataDirectory, 'store.json')
const databaseName = process.env.MONGODB_DATABASE
const storeCollections = ['users', 'admins', 'products', 'orders']
let mongoClient
let mongoDatabasePromise
let writeQueue = Promise.resolve()

const emptyStore = () => ({ users: [], admins: [], products: [], orders: [] })

function isMongoConfigured() {
  return Boolean(process.env.DATABASE_URL)
}

function getMongoDatabase() {
  if (!isMongoConfigured()) throw new Error('DATABASE_URL is required to use MongoDB.')
  if (!mongoDatabasePromise) {
    mongoClient = new MongoClient(process.env.DATABASE_URL, { serverSelectionTimeoutMS: 10000 })
    mongoDatabasePromise = mongoClient.connect().then(async (client) => {
      const database = client.db(databaseName)
      const topology = await database.admin().command({ hello: 1 })
      if (!topology.setName && topology.msg !== 'isdbgrid') {
        throw new Error('MongoDB transactions require a replica set or sharded cluster. Use MongoDB Atlas or another replica-set deployment.')
      }
      await Promise.all([
        database.collection('users').createIndex({ email: 1 }, { unique: true }),
        database.collection('admins').createIndex({ email: 1 }, { unique: true }),
        database.collection('orders').createIndex({ userId: 1 }),
      ])
      return database
    })
  }
  return mongoDatabasePromise
}

async function readFileStore() {
  await fs.mkdir(path.dirname(databasePath), { recursive: true })
  try {
    const contents = await fs.readFile(databasePath, 'utf8')
    return { ...emptyStore(), ...JSON.parse(contents) }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const initial = emptyStore()
    await fs.writeFile(databasePath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8')
    return initial
  }
}

async function readMongoStore(session) {
  const database = await getMongoDatabase()
  if (!session) {
    try {
      await database.collection('store_metadata').updateOne(
        { _id: 'primary' },
        { $setOnInsert: { revision: 0 } },
        { upsert: true },
      )
    } catch (error) {
      if (error.code !== 11000) throw error
    }
  }

  const store = emptyStore()
  const records = await Promise.all(storeCollections.map((name) => database.collection(name).find({}, { session }).toArray()))
  storeCollections.forEach((name, index) => {
    store[name] = records[index].map(({ _id, ...record }) => ({ ...record, id: _id }))
  })
  return store
}

async function readStore() {
  return isMongoConfigured() ? readMongoStore() : readFileStore()
}

function updateStore(update) {
  const operation = writeQueue.then(async () => {
    if (!isMongoConfigured()) {
      const store = await readFileStore()
      const result = await update(store)
      const temporaryPath = `${databasePath}.tmp`
      await fs.writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
      await fs.rename(temporaryPath, databasePath)
      return result
    }

    const database = await getMongoDatabase()
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const session = mongoClient.startSession()
      try {
        let result
        await session.withTransaction(async () => {
          const metadata = database.collection('store_metadata')
          await metadata.updateOne(
            { _id: 'primary' },
            { $setOnInsert: { revision: 0 } },
            { upsert: true, session },
          )
          const version = await metadata.findOne({ _id: 'primary' }, { session })
          if (!version) throw new Error('The MongoDB store metadata could not be initialized.')

          const store = await readMongoStore(session)
          const originalRecords = new Map(storeCollections.map((name) => [
            name,
            new Map(store[name].map((record) => [record.id, JSON.stringify(record)])),
          ]))
          result = await update(store)

          const versionUpdate = await metadata.updateOne(
            { _id: 'primary', revision: version.revision },
            { $inc: { revision: 1 } },
            { session },
          )
          if (versionUpdate.matchedCount !== 1) {
            const error = new Error('The store changed concurrently. Please retry the request.')
            error.code = 'STORE_WRITE_CONFLICT'
            throw error
          }

          for (const name of storeCollections) {
            const previous = originalRecords.get(name)
            const currentRecords = new Map(store[name].map((record) => [record.id, record]))
            const operations = []
            for (const [id] of previous) {
              if (!currentRecords.has(id)) operations.push({ deleteOne: { filter: { _id: id } } })
            }
            for (const [id, record] of currentRecords) {
              if (previous.get(id) !== JSON.stringify(record)) {
                const { id: _id, ...fields } = record
                operations.push({ replaceOne: { filter: { _id }, replacement: { _id, ...fields }, upsert: true } })
              }
            }
            if (operations.length > 0) {
              await database.collection(name).bulkWrite(operations, { session })
            }
          }
        }, {
          readConcern: { level: 'snapshot' },
          writeConcern: { w: 'majority' },
          readPreference: 'primary',
        })
        return result
      } catch (error) {
        if (error.code !== 'STORE_WRITE_CONFLICT' || attempt === 4) {
          if (error.code === 'STORE_WRITE_CONFLICT') error.status = 503
          throw error
        }
      } finally {
        await session.endSession()
      }
    }
    throw new Error('The MongoDB store could not be updated.')
  })
  writeQueue = operation.catch(() => undefined)
  return operation
}

async function getImageBucket() {
  return new GridFSBucket(await getMongoDatabase(), { bucketName: 'product_images' })
}

async function closeDatabase() {
  if (mongoClient) await mongoClient.close()
}

module.exports = {
  databasePath,
  readStore,
  updateStore,
  isMongoConfigured,
  getImageBucket,
  closeDatabase,
}
