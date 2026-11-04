const fs = require('node:fs/promises')
const path = require('node:path')

const dataDirectory = path.join(__dirname, 'data')
const databasePath = process.env.STORE_PATH || path.join(dataDirectory, 'store.json')
let writeQueue = Promise.resolve()

const emptyStore = () => ({ users: [], admins: [], products: [], orders: [] })

async function readStore() {
  await fs.mkdir(path.dirname(databasePath), { recursive: true })
  try {
    const contents = await fs.readFile(databasePath, 'utf8')
    const store = JSON.parse(contents)
    return { ...emptyStore(), ...store }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
    const initial = emptyStore()
    await fs.writeFile(databasePath, `${JSON.stringify(initial, null, 2)}\n`, 'utf8')
    return initial
  }
}

function updateStore(update) {
  const operation = writeQueue.then(async () => {
    const store = await readStore()
    const result = await update(store)
    const temporaryPath = `${databasePath}.tmp`
    await fs.writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, 'utf8')
    await fs.rename(temporaryPath, databasePath)
    return result
  })
  writeQueue = operation.catch(() => undefined)
  return operation
}

// TODO: Swap this file-based database for cloud Supabase/PostgreSQL here later on PC
module.exports = { databasePath, readStore, updateStore }
