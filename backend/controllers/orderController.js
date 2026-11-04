const crypto = require('node:crypto')
const { readStore, updateStore } = require('../database')

async function createOrder(request, response, next) {
  try {
    const { items, delivery, paymentMethod } = request.body
    if (!Array.isArray(items) || items.length === 0 || !delivery?.fullName || !delivery?.phone || !delivery?.city || !delivery?.address) {
      return response.status(400).json({ error: 'A non-empty cart and complete delivery details are required.' })
    }
    if (items.length > 100 || items.some((item) => !item || typeof item !== 'object' || !item.product?.id || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 99)) {
      return response.status(400).json({ error: 'The order contains invalid cart items.' })
    }
    const order = await updateStore((store) => {
      const verifiedItems = items.map(({ product, quantity }) => {
        const catalogProduct = store.products.find((entry) => entry.id === product.id)
        if (!catalogProduct) {
          const error = new Error('One or more products are no longer available.')
          error.status = 400
          throw error
        }
        return { product: catalogProduct, quantity }
      })
      const verifiedSubtotal = verifiedItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0)
      const verifiedShipping = verifiedItems.length ? 2500 : 0
      const verifiedTax = Math.round(verifiedSubtotal * 0.075)
      const verifiedTotal = verifiedSubtotal + verifiedShipping + verifiedTax
      const newOrder = {
        id: `SC-${Date.now().toString().slice(-8)}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`,
        userId: request.customer.id,
        items: verifiedItems,
        delivery: {
          fullName: String(delivery.fullName).trim(),
          phone: String(delivery.phone).trim(),
          city: String(delivery.city).trim(),
          address: String(delivery.address).trim(),
          notes: String(delivery.notes || '').trim(),
        },
        subtotal: verifiedSubtotal,
        shipping: verifiedShipping,
        tax: verifiedTax,
        total: verifiedTotal,
        paymentMethod: paymentMethod === 'delivery' ? 'delivery' : 'card',
        status: 'Order Placed',
        createdAt: new Date().toISOString(),
      }
      store.orders.unshift(newOrder)
      return newOrder
    })
    response.status(201).json({ order })
  } catch (error) {
    next(error)
  }
}

async function listOrders(_request, response, next) {
  try {
    const store = await readStore()
    response.json({ orders: store.orders })
  } catch (error) {
    next(error)
  }
}

async function listCustomerOrders(request, response, next) {
  try {
    const store = await readStore()
    response.json({ orders: store.orders.filter((order) => order.userId === request.customer.id) })
  } catch (error) {
    next(error)
  }
}

async function trackOrder(request, response, next) {
  try {
    const store = await readStore()
    const order = store.orders.find((entry) => entry.id.toLowerCase() === request.params.orderId.toLowerCase() && entry.userId === request.customer.id)
    if (!order) return response.status(404).json({ error: 'No order was found with that reference.' })
    response.json({
      order: {
        id: order.id,
        itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
        status: order.status,
        createdAt: order.createdAt,
        city: order.delivery.city,
      },
    })
  } catch (error) {
    next(error)
  }
}

async function updateOrderStatus(request, response, next) {
  try {
    const allowedStatuses = new Set(['Order Placed', 'Processing', 'Dispatched', 'Out for Delivery'])
    const status = String(request.body.status || '')
    if (!allowedStatuses.has(status)) return response.status(400).json({ error: 'Order status is invalid.' })
    const order = await updateStore((store) => {
      const match = store.orders.find((entry) => entry.id === request.params.orderId)
      if (!match) return null
      match.status = status
      match.updatedAt = new Date().toISOString()
      return match
    })
    if (!order) return response.status(404).json({ error: 'Order was not found.' })
    response.json({ order })
  } catch (error) {
    next(error)
  }
}

module.exports = { createOrder, listOrders, listCustomerOrders, trackOrder, updateOrderStatus }
