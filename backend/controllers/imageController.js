const { getImageBucket, isMongoConfigured } = require('../database')

async function serveProductImage(request, response, next) {
  if (!isMongoConfigured() || !/^[0-9a-f-]{36}\.(jpg|png|webp|avif)$/i.test(request.params.filename)) {
    return response.status(404).json({ error: 'Product image was not found.' })
  }

  try {
    const bucket = await getImageBucket()
    const [file] = await bucket.find({ filename: request.params.filename }).sort({ uploadDate: -1 }).limit(1).toArray()
    if (!file) return response.status(404).json({ error: 'Product image was not found.' })

    response.set({
      'Cache-Control': 'public, max-age=31536000, immutable',
      'Content-Type': file.metadata?.contentType || 'application/octet-stream',
      'X-Content-Type-Options': 'nosniff',
    })
    const downloadStream = bucket.openDownloadStream(file._id)
    downloadStream.once('error', next)
    downloadStream.pipe(response)
  } catch (error) {
    next(error)
  }
}

module.exports = { serveProductImage }
