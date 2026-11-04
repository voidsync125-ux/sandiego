const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const path = require('node:path')
const multer = require('multer')

const productsDirectory = path.join(__dirname, '..', 'public', 'uploads', 'products')
const imageTypes = {
  'image/jpeg': { extension: '.jpg', matches: (buffer) => buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff },
  'image/png': { extension: '.png', matches: (buffer) => buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  'image/webp': { extension: '.webp', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP' },
  'image/avif': { extension: '.avif', matches: (buffer) => buffer.length >= 12 && buffer.toString('ascii', 4, 8) === 'ftyp' && ['avif', 'avis'].includes(buffer.toString('ascii', 8, 12)) },
}

const uploadProductImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 5 },
  fileFilter: (_request, file, callback) => {
    if (!Object.hasOwn(imageTypes, file.mimetype)) return callback(new Error('Upload a JPG, PNG, WEBP, or AVIF product image.'))
    callback(null, true)
  },
}).array('images', 5)

async function saveProductImage(request, response, next) {
  const files = Array.isArray(request.files) ? request.files : []
  if (files.length < 1 || files.length > 5) {
    return response.status(400).json({ error: 'Upload between one and five product images.' })
  }
  const resolvedFiles = files.map((file) => ({ file, imageType: Object.hasOwn(imageTypes, file.mimetype) ? imageTypes[file.mimetype] : null }))
  if (resolvedFiles.some(({ file, imageType }) => !imageType || !imageType.matches(file.buffer))) {
    return response.status(400).json({ error: 'An uploaded file is not a valid supported image.' })
  }

  const savedPaths = []
  try {
    await fs.mkdir(productsDirectory, { recursive: true })
    for (const { file, imageType } of resolvedFiles) {
      const filename = `${crypto.randomUUID()}${imageType.extension}`
      const filePath = path.join(productsDirectory, filename)
      await fs.writeFile(filePath, file.buffer, { flag: 'wx' })
      savedPaths.push(filePath)
      file.filename = filename
      file.publicPath = `/uploads/products/${filename}`
    }
    next()
  } catch (error) {
    await Promise.all(savedPaths.map((filePath) => fs.unlink(filePath).catch(() => undefined)))
    next(error)
  }
}

module.exports = { productsDirectory, uploadProductImage, saveProductImage }
