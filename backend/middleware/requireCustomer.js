const jwt = require('jsonwebtoken')
const { readStore } = require('../database')

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-only-change-this-secret'

async function requireCustomer(request, response, next) {
  try {
    const authorization = request.get('authorization') || ''
    const [scheme, token] = authorization.split(' ')
    if (scheme !== 'Bearer' || !token) return response.status(401).json({ error: 'Customer sign-in is required.' })

    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'sandiego-collections' })
    if (payload.role !== 'customer' || typeof payload.sub !== 'string') {
      return response.status(403).json({ error: 'A customer account is required for this action.' })
    }

    const store = await readStore()
    const customer = store.users.find((user) => user.id === payload.sub && user.role === 'customer')
    if (!customer) return response.status(401).json({ error: 'Customer account is no longer active.' })
    request.customer = { id: customer.id, fullName: customer.fullName, email: customer.email }
    next()
  } catch {
    response.status(401).json({ error: 'Customer session is invalid or expired.' })
  }
}

module.exports = { requireCustomer }
