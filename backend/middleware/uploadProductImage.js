const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const multer = require('multer')
const { getImageBucket, isMongoConfigured } = require('../database')

const productsDirectory = path.join(__dirname, '..', 'public', 'uploads', 'products')
const imageTypes = {
  'image/jpeg': { extension: '.jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: '.png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/webp': { extension: '.webp', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
  'image/avif': { extension: '.avif', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12)) },
}

async function removeUploadedFiles(removeFiles, originalError) {
  const cleanupErrors = []
  for (const removeFile of removeFiles) {
    try {
      await removeFile()
    } catch (error) {
      cleanupErrors.push(error)
    }
  }
  if (cleanupErrors.length) {
    throw new AggregateError([originalError, ...cleanupErrors], 'Image upload failed and partial-file cleanup was incomplete.')
  }
  throw originalError
}

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_request, file, callback) => {
    if (!Object.hasOwn(imageTypes, file.mimetype)) return callback(new Error('Upload a JPG, PNG, WEBP, or AVIF product image.'))
    callback(null, true)
  },
}).array('images', 5)

async function saveImagesToMongo(files) {
  const bucket = await getImageBucket()
  const savedIds = []
  try {
    for (const { file, imageType } of files) {
      const filename = `${crypto.randomUUID()}${imageType.extension}`
      const uploadStream = bucket.openUploadStream(filename, {
        metadata: { contentType: file.mimetype },
      })
      savedIds.push(uploadStream.id)
      await new Promise((resolve, reject) => {
        uploadStream.once('error', reject)
        uploadStream.once('finish', resolve)
        uploadStream.end(file.buffer)
      })
      file.filename = filename
      file.publicPath = `/uploads/products/${filename}`
    }
  } catch (error) {
    await removeUploadedFiles(savedIds.map((id) => () => bucket.delete(id)), error)
  }
}

async function saveImagesToDisk(files) {
  const savedPaths = []
  try {
    await fs.mkdir(productsDirectory, { recursive: true })
    for (const { file, imageType } of files) {
      const filename = `${crypto.randomUUID()}${imageType.extension}`
      const filePath = path.join(productsDirectory, filename)
      await fs.writeFile(filePath, file.buffer, { flag: 'wx' })
      savedPaths.push(filePath)
      file.filename = filename
      file.publicPath = `/uploads/products/${filename}`
    }
  } catch (error) {
    await removeUploadedFiles(savedPaths.map((filePath) => () => fs.unlink(filePath)), error)
  }
}

async function saveProductImage(request, response, next) {
  const files = Array.isArray(request.files) ? request.files : []
  if (files.length < 1 || files.length > 5) {
    return response.status(400).json({ error: 'Upload between one and five product images.' })
  }
  const resolvedFiles = files.map((file) => ({ file, imageType: Object.hasOwn(imageTypes, file.mimetype) ? imageTypes[file.mimetype] : null }))
  if (resolvedFiles.some(({ file, imageType }) => !imageType || !imageType.matches(file.buffer))) {
    return response.status(400).json({ error: 'An uploaded file is not a valid supported image.' })
  }

  try {
    if (isMongoConfigured()) await saveImagesToMongo(resolvedFiles)
    else await saveImagesToDisk(resolvedFiles)
    next()
  } catch (error) {
    next(error)
  }
}

function getStoredImageFilename(imageUrl) {
  try {
    const pathname = new URL(imageUrl, 'http://localhost').pathname
    const filename = decodeURIComponent(pathname.slice(pathname.lastIndexOf('/') + 1))
    return /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(jpg|png|webp|avif)$/i.test(filename)
      ? filename
      : null
  } catch {
    return null
  }
}

async function deleteProductImages(imageUrls, referencedImageUrls) {
  const referencedFilenames = new Set(referencedImageUrls.map(getStoredImageFilename).filter(Boolean))
  const filenamesToDelete = [...new Set(imageUrls.map(getStoredImageFilename).filter(Boolean))]
    .filter((filename) => !referencedFilenames.has(filename))
  if (!filenamesToDelete.length) return

  if (isMongoConfigured()) {
    const bucket = await getImageBucket()
    const files = await bucket.find({ filename: { $in: filenamesToDelete } }).toArray()
    for (const file of files) await bucket.delete(file._id)
    return
  }

  for (const filename of filenamesToDelete) {
    try {
      await fs.unlink(path.join(productsDirectory, filename))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
    }
  }
}

module.exports = { productsDirectory, uploadProductImage, saveProductImage, deleteProductImages }
