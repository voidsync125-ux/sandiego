const crypto = require('node:crypto')
const { readStore, updateStore } = require('../database')

const categories = new Set(['Clothes', 'Jewelries', 'Organic Soap', 'Cream'])
const apiOrigin = process.env.PUBLIC_API_URL || `http://localhost:${process.env.PORT || 5000}`

function validateProduct(request, response, next) {
  const name = String(request.body.name || '').trim()
  const category = String(request.body.category || '')
  const description = String(request.body.description || '').trim()
  const benefitsText = String(request.body.benefits || '').trim()
  const price = Number(request.body.price)
  const files = Array.isArray(request.files) ? request.files : []
  if (!name || name.length > 120 || !categories.has(category) || !description || description.length > 3000 || benefitsText.length > 2000 || !Number.isFinite(price) || price <= 0 || files.length < 1 || files.length > 5) {
    return response.status(400).json({ error: 'Provide a valid name, category, positive price, description, and between one and five product images.' })
  }
  next()
}

async function listProducts(_request, response, next) {
  try {
    const store = await readStore()
    response.json({ products: store.products })
  } catch (error) {
    next(error)
  }
}

async function createProduct(request, response, next) {
  try {
    const name = String(request.body.name || '').trim()
    const category = String(request.body.category || '')
    const description = String(request.body.description || '').trim()
    const benefitsText = String(request.body.benefits || '').trim()
    const price = Number(request.body.price)
    const files = Array.isArray(request.files) ? request.files : []
    const images = files.map((file) => `${apiOrigin}${file.publicPath}`)
    const product = {
      id: crypto.randomUUID(),
      name,
      category,
      price: Math.round(price),
      description,
      benefits: benefitsText.split('\n').map((benefit) => benefit.trim()).filter(Boolean).slice(0, 12),
      image: images[0],
      images,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date().toISOString(),
    }
    await updateStore((store) => { store.products.unshift(product) })
    response.status(201).json({ product })
  } catch (error) {
    next(error)
  }
}

module.exports = { listProducts, validateProduct, createProduct }
