const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { updateStore, readStore } = require('../database')

const ADMIN_LIMIT = 3
const JWT_SECRET = process.env.JWT_SECRET || 'local-development-only-change-this-secret'
const EMAIL_PATTERN = /^(?=.{1,64}@)(?=.{1,254}$)[a-z0-9](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9])?@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email) && !email.includes('..')
}

function safeCompare(left, right) {
  if (!left || !right) return false
  const leftBuffer = Buffer.from(left)
  const rightBuffer = Buffer.from(right)
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer)
}

async function getAdminCount(_request, response, next) {
  try {
    const store = await readStore()
    response.json({ count: store.admins.length, limit: ADMIN_LIMIT, registrationOpen: store.admins.length < ADMIN_LIMIT })
  } catch (error) {
    next(error)
  }
}

async function signupCustomer(request, response, next) {
  try {
    const fullName = String(request.body.fullName || '').trim()
    const email = String(request.body.email || '').trim().toLowerCase()
    const password = String(request.body.password || '')
    if (!fullName || !isValidEmail(email) || password.length < 10) {
      return response.status(400).json({ error: !isValidEmail(email) ? 'Enter a valid email address (for example name@example.com).' : 'Provide a name and password of at least 10 characters.' })
    }

    const user = await updateStore(async (store) => {
      if (store.users.some((account) => account.email === email)) {
        const error = new Error('An account with this email already exists.')
        error.status = 409
        throw error
      }
      const account = {
        id: crypto.randomUUID(),
        fullName,
        email,
        passwordHash: await bcrypt.hash(password, 12),
        role: 'customer',
        createdAt: new Date().toISOString(),
      }
      store.users.push(account)
      return { id: account.id, fullName, email, role: account.role }
    })
    const token = jwt.sign({ sub: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '12h', issuer: 'sandiego-collections' })
    response.status(201).json({ user, token })
  } catch (error) {
    next(error)
  }
}

async function loginCustomer(request, response, next) {
  try {
    const email = String(request.body.email || '').trim().toLowerCase()
    const password = String(request.body.password || '')
    if (!isValidEmail(email)) return response.status(400).json({ error: 'Enter a valid email address (for example name@example.com).' })
    const store = await readStore()
    const user = store.users.find((account) => account.email === email && account.role === 'customer')
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ error: 'Email or password is incorrect.' })
    }
    const token = jwt.sign({ sub: user.id, role: 'customer' }, JWT_SECRET, { expiresIn: '12h', issuer: 'sandiego-collections' })
    response.json({ user: { id: user.id, fullName: user.fullName, email: user.email }, token })
  } catch (error) {
    next(error)
  }
}

async function changeCustomerPassword(request, response, next) {
  try {
    const currentPassword = String(request.body.currentPassword || '')
    const newPassword = String(request.body.newPassword || '')
    if (!currentPassword || newPassword.length < 10) {
      return response.status(400).json({ error: 'Enter your current password and a new password of at least 10 characters.' })
    }

    await updateStore(async (store) => {
      const customer = store.users.find((user) => user.id === request.customer.id && user.role === 'customer')
      if (!customer || !(await bcrypt.compare(currentPassword, customer.passwordHash))) {
        const error = new Error('Your current password is incorrect.')
        error.status = 400
        throw error
      }
      customer.passwordHash = await bcrypt.hash(newPassword, 12)
    })
    response.json({ message: 'Password updated successfully.' })
  } catch (error) {
    next(error)
  }
}

async function loginAdmin(request, response, next) {
  try {
    const email = String(request.body.email || '').trim().toLowerCase()
    const password = String(request.body.password || '')
    if (!isValidEmail(email)) return response.status(400).json({ error: 'Enter a valid email address (for example name@example.com).' })
    const store = await readStore()
    const admin = store.admins.find((account) => account.email === email)
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      return response.status(401).json({ error: 'Email or password is incorrect.' })
    }
    const token = jwt.sign({ sub: admin.id, role: 'admin' }, JWT_SECRET, { expiresIn: '12h', issuer: 'sandiego-collections' })
    response.json({ admin: { id: admin.id, fullName: admin.fullName, email: admin.email }, token })
  } catch (error) {
    next(error)
  }
}

async function signupAdmin(request, response, next) {
  try {
    const currentStore = await readStore()
    if (currentStore.admins.length >= ADMIN_LIMIT) {
      return response.status(403).json({ error: 'Registration Closed' })
    }

    const fullName = String(request.body.fullName || '').trim()
    const email = String(request.body.email || '').trim().toLowerCase()
    const password = String(request.body.password || '')
    const inviteCode = String(request.body.inviteCode || '')
    const configuredInvite = process.env.ADMIN_SIGNUP_INVITE

    if (!fullName || !isValidEmail(email) || password.length < 12) {
      return response.status(400).json({ error: !isValidEmail(email) ? 'Enter a valid email address (for example name@example.com).' : 'Provide a name and password of at least 12 characters.' })
    }
    if (!configuredInvite || !safeCompare(inviteCode, configuredInvite)) {
      return response.status(403).json({ error: 'A valid private administrator invitation is required.' })
    }

    const result = await updateStore(async (store) => {
      if (store.admins.length >= ADMIN_LIMIT) {
        const error = new Error('Registration Closed')
        error.status = 403
        throw error
      }
      if (store.users.some((user) => user.email === email)) {
        const error = new Error('An administrator with this email already exists.')
        error.status = 409
        throw error
      }

      const passwordHash = await bcrypt.hash(password, 12)
      const admin = {
        id: crypto.randomUUID(),
        fullName,
        email,
        passwordHash,
        role: 'admin',
        createdAt: new Date().toISOString(),
      }
      store.admins.push(admin)
      store.users.push({ id: admin.id, fullName, email, passwordHash, role: 'admin', createdAt: admin.createdAt })
      return { id: admin.id, fullName, email, role: admin.role }
    })

    const token = jwt.sign({ sub: result.id, role: 'admin' }, JWT_SECRET, { expiresIn: '12h', issuer: 'sandiego-collections' })
    response.status(201).json({ admin: result, token, adminCount: (await readStore()).admins.length })
  } catch (error) {
    next(error)
  }
}

module.exports = { getAdminCount, signupAdmin, signupCustomer, loginCustomer, loginAdmin, changeCustomerPassword }
