require('dotenv').config()

const fs = require('node:fs')
const path = require('node:path')
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const multer = require('multer')
const rateLimit = require('express-rate-limit')
const { readStore } = require('./database')
const { getAdminCount, signupAdmin, signupCustomer, loginCustomer, loginAdmin, changeCustomerPassword } = require('./controllers/authController')
const { createProduct, listProducts, validateProduct } = require('./controllers/productController')
const { createOrder, listOrders, listCustomerOrders, trackOrder, updateOrderStatus } = require('./controllers/orderController')
const { requireAdmin } = require('./middleware/requireAdmin')
const { requireCustomer } = require('./middleware/requireCustomer')
const { uploadProductImage, saveProductImage } = require('./middleware/uploadProductImage')

const app = express()
const port = Number(process.env.PORT) || 5000
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)) {
  throw new Error('Set JWT_SECRET to a random value of at least 32 characters in production.')
}
const uploadDirectory = path.join(__dirname, 'public', 'uploads')
const allowedOrigins = (process.env.CLIENT_ORIGIN || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',').map((origin) => origin.trim())
const isLocalViteOrigin = (origin) => {
  if (process.env.NODE_ENV === 'production') return false
  try {
    const url = new URL(origin)
    const portNumber = Number(url.port)
    return ['localhost', '127.0.0.1'].includes(url.hostname) && portNumber >= 5173 && portNumber <= 5199
  } catch {
    return false
  }
}

fs.mkdirSync(path.join(uploadDirectory, 'products'), { recursive: true })

app.disable('x-powered-by')
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin) || isLocalViteOrigin(origin)) return callback(null, true)
    return callback(new Error('Origin is not allowed by CORS.'))
  },
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))
app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(uploadDirectory, { maxAge: '1d', immutable: true }))
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), { maxAge: '1d', immutable: true }))

const signupLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false })
const orderLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: 'draft-8', legacyHeaders: false })

app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.get('/api/auth/admin/count', getAdminCount)
app.post('/api/auth/admin/signup', signupLimiter, signupAdmin)
app.post('/api/auth/signup', signupLimiter, signupCustomer)
app.post('/api/auth/login', signupLimiter, loginCustomer)
app.post('/api/auth/admin/login', signupLimiter, loginAdmin)
app.get('/api/auth/me', requireCustomer, (request, response) => response.json({ user: request.customer }))
app.patch('/api/auth/password', signupLimiter, requireCustomer, changeCustomerPassword)
app.get('/api/auth/admin/me', requireAdmin, (request, response) => response.json({ admin: request.admin }))

app.get('/api/products', listProducts)
app.post('/api/products', requireAdmin, uploadProductImage, validateProduct, saveProductImage, createProduct)

app.post('/api/orders', orderLimiter, requireCustomer, createOrder)
app.get('/api/orders/mine', requireCustomer, listCustomerOrders)
app.get('/api/orders/:orderId', orderLimiter, requireCustomer, trackOrder)
app.get('/api/admin/orders', requireAdmin, listOrders)
app.patch('/api/admin/orders/:orderId/status', requireAdmin, express.json(), updateOrderStatus)

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE' ? 'Each product image must be 5 MB or smaller.' : 'Product image upload was rejected.'
    return response.status(400).json({ error: message })
  }
  const status = Number(error.status) || (error.message.startsWith('Upload a JPG') ? 400 : 500)
  if (status >= 500) console.error(error)
  response.status(status).json({ error: status >= 500 ? 'The server could not complete the request.' : error.message })
})

readStore().then(() => {
  app.listen(port, () => console.log(`Sandiego Collections API listening on http://localhost:${port}`))
}).catch((error) => {
  console.error('Could not initialize the local database.', error)
  process.exitCode = 1
})
