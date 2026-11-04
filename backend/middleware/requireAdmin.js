const jwt = require('jsonwebtoken')
const { readStore } = require('../database')

const JWT_SECRET = process.env.JWT_SECRET || 'local-development-only-change-this-secret'

async function requireAdmin(request, response, next) {
  try {
    const authorization = request.get('authorization') || ''
    const [scheme, token] = authorization.split(' ')
    if (scheme !== 'Bearer' || !token) return response.status(401).json({ error: 'Administrator authentication is required.' })

    const payload = jwt.verify(token, JWT_SECRET, { issuer: 'sandiego-collections' })
    if (payload.role !== 'admin' || typeof payload.sub !== 'string') {
      return response.status(403).json({ error: 'Administrator access is required.' })
    }

    const store = await readStore()
    const admin = store.admins.find((entry) => entry.id === payload.sub)
    if (!admin) return response.status(401).json({ error: 'Administrator account is no longer active.' })

    request.admin = { id: admin.id, fullName: admin.fullName, email: admin.email }
    next()
  } catch {
    response.status(401).json({ error: 'Administrator session is invalid or expired.' })
  }
}

module.exports = { requireAdmin }
