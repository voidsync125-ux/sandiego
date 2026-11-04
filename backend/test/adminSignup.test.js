const { after, test } = require('node:test')
const assert = require('node:assert/strict')
const crypto = require('node:crypto')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')

const testDirectory = path.join(os.tmpdir(), `sandiego-admin-test-${crypto.randomUUID()}`)
process.env.STORE_PATH = path.join(testDirectory, 'store.json')
process.env.ADMIN_SIGNUP_INVITE = 'test-only-private-invitation'
process.env.JWT_SECRET = 'test-only-secret-that-is-at-least-32-characters-long'

const { changeCustomerPassword, getAdminCount, loginCustomer, signupAdmin, signupCustomer } = require('../controllers/authController')
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

async function invokeSignup(index, overrides = {}) {
  const response = responseCapture()
  let forwardedError
  await signupAdmin({
    body: {
      fullName: `Admin ${index}`,
      email: `admin${index}@example.com`,
      password: 'local-test-password-123',
      inviteCode: process.env.ADMIN_SIGNUP_INVITE,
      ...overrides,
    },
  }, response, (error) => { forwardedError = error })
  if (forwardedError) {
    response.status(forwardedError.status || 500).json({ error: forwardedError.message })
  }
  return response
}

after(async () => {
  await fs.rm(testDirectory, { recursive: true, force: true })
})

test('admin signup is serialized, capped at three, and permanently closed at the cap', async () => {
  const customerSignup = responseCapture()
  await signupCustomer({ body: { fullName: 'Customer Shopper', email: 'customer@example.com', password: 'customer-test-password' } }, customerSignup, (error) => { throw error })
  assert.equal(customerSignup.statusCode, 201)
  assert.ok(customerSignup.payload.token)

  const customerLogin = responseCapture()
  await loginCustomer({ body: { email: 'customer@example.com', password: 'customer-test-password' } }, customerLogin, (error) => { throw error })
  assert.equal(customerLogin.statusCode, 200)
  assert.equal(customerLogin.payload.user.fullName, 'Customer Shopper')

  const rejectedCustomerLogin = responseCapture()
  await loginCustomer({ body: { email: 'customer@example.com', password: 'wrong-password' } }, rejectedCustomerLogin, (error) => { throw error })
  assert.equal(rejectedCustomerLogin.statusCode, 401)

  const passwordChange = responseCapture()
  await changeCustomerPassword({ customer: { id: customerSignup.payload.user.id }, body: { currentPassword: 'customer-test-password', newPassword: 'updated-customer-password' } }, passwordChange, (error) => { throw error })
  assert.equal(passwordChange.statusCode, 200)
  const oldPasswordLogin = responseCapture()
  await loginCustomer({ body: { email: 'customer@example.com', password: 'customer-test-password' } }, oldPasswordLogin, (error) => { throw error })
  assert.equal(oldPasswordLogin.statusCode, 401)
  const updatedPasswordLogin = responseCapture()
  await loginCustomer({ body: { email: 'customer@example.com', password: 'updated-customer-password' } }, updatedPasswordLogin, (error) => { throw error })
  assert.equal(updatedPasswordLogin.statusCode, 200)

  const invalidAdminEmail = await invokeSignup(8, { email: 'admin@.com' })
  assert.equal(invalidAdminEmail.statusCode, 400)
  assert.match(invalidAdminEmail.payload.error, /valid email address/)

  const concurrentAttempts = await Promise.all(Array.from({ length: 5 }, (_, index) => invokeSignup(index)))
  assert.equal(concurrentAttempts.filter((response) => response.statusCode === 201).length, 3)
  assert.equal(concurrentAttempts.filter((response) => response.statusCode === 403 && response.payload.error === 'Registration Closed').length, 2)

  const store = await readStore()
  assert.equal(store.admins.length, 3)
  assert.equal(store.users.filter((user) => user.role === 'admin').length, 3)
  assert.equal(store.users.filter((user) => user.role === 'customer').length, 1)
  assert.ok(store.admins.every((admin) => admin.passwordHash.startsWith('$2')))
  assert.ok(store.admins.every((admin) => !Object.hasOwn(admin, 'password')))

  const countResponse = responseCapture()
  await getAdminCount({}, countResponse, (error) => { throw error })
  assert.deepEqual(countResponse.payload, { count: 3, limit: 3, registrationOpen: false })

  const rejected = await invokeSignup(9, { fullName: '', inviteCode: '' })
  assert.equal(rejected.statusCode, 403)
  assert.equal(rejected.payload.error, 'Registration Closed')
})

test('customer signup and login reject malformed email addresses', async () => {
  const signup = responseCapture()
  await signupCustomer({ body: { fullName: 'Customer Shopper', email: 'missing-domain@', password: 'customer-test-password' } }, signup, (error) => { throw error })
  assert.equal(signup.statusCode, 400)
  assert.match(signup.payload.error, /valid email address/)

  const login = responseCapture()
  await loginCustomer({ body: { email: 'person@domain', password: 'anything' } }, login, (error) => { throw error })
  assert.equal(login.statusCode, 400)
  assert.match(login.payload.error, /valid email address/)
})
