const { after, test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const testDirectory = path.join(os.tmpdir(), `sandiego-orders-test-${crypto.randomUUID()}`)
process.env.STORE_PATH = path.join(testDirectory, 'store.json')

const { createProduct, listProducts } = require('../controllers/productController')
const { createOrder, trackOrder, updateOrderStatus } = require('../controllers/orderController')
const { readStore } = require('../database')

function responseCapture() {
  return {
    statusCode: 200,
    payload: null,
    status(code) {
      this.statusCode = code
      return this
    },
    json(payload) {
      this.payload = payload
      return this
    },
  }
}

after(async () => {
  await fs.rm(testDirectory, { recursive: true, force: true })
})

test('only uploaded inventory is listed and checkout orders use persisted product prices', async () => {
  const productResponse = responseCapture()
  await createProduct({
    body: { name: 'Test garment', category: 'Clothes', price: '12000', description: 'A test item', benefits: 'One benefit' },
    files: [{ publicPath: '/uploads/products/first.jpg' }, { publicPath: '/uploads/products/second.jpg' }],
  }, productResponse, (error) => { throw error })
  assert.equal(productResponse.statusCode, 201)
  assert.equal(productResponse.payload.product.images.length, 2)

  const inventoryResponse = responseCapture()
  await listProducts({}, inventoryResponse, (error) => { throw error })
  assert.deepEqual(inventoryResponse.payload.products.map((product) => product.id), [productResponse.payload.product.id])

  const orderResponse = responseCapture()
  await createOrder({
    customer: { id: 'customer-1' },
    body: {
      items: [{ product: { id: productResponse.payload.product.id, name: 'Tampered name', price: 1 }, quantity: 2 }],
      delivery: { fullName: 'Test Customer', phone: '08000000000', city: 'Lagos', address: 'Test address' },
      paymentMethod: 'delivery',
      subtotal: 2,
      shipping: 0,
      tax: 0,
      total: 2,
    },
  }, orderResponse, (error) => { throw error })
  assert.equal(orderResponse.statusCode, 201)
  assert.equal(orderResponse.payload.order.items[0].product.name, 'Test garment')
  assert.equal(orderResponse.payload.order.subtotal, 24000)
  assert.equal(orderResponse.payload.order.shipping, 2500)
  assert.equal(orderResponse.payload.order.tax, 1800)
  assert.equal(orderResponse.payload.order.total, 28300)

  const unavailableProductOrder = responseCapture()
  await createOrder({
    customer: { id: 'customer-1' },
    body: {
      items: [{ product: { id: 'not-in-inventory' }, quantity: 1 }],
      delivery: { fullName: 'Test Customer', phone: '08000000000', city: 'Lagos', address: 'Test address' },
    },
  }, unavailableProductOrder, (error) => { unavailableProductOrder.status(error.status).json({ error: error.message }) })
  assert.equal(unavailableProductOrder.statusCode, 400)

  const statusResponse = responseCapture()
  await updateOrderStatus({
    params: { orderId: orderResponse.payload.order.id },
    body: { status: 'Dispatched' },
  }, statusResponse, (error) => { throw error })
  assert.equal(statusResponse.payload.order.status, 'Dispatched')

  const trackingResponse = responseCapture()
  await trackOrder({
    params: { orderId: orderResponse.payload.order.id },
    customer: { id: 'customer-1' },
  }, trackingResponse, (error) => { throw error })
  assert.equal(trackingResponse.payload.order.status, 'Dispatched')

  const store = await readStore()
  assert.equal(store.orders[0].status, 'Dispatched')
})
