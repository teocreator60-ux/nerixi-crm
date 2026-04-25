import crypto from 'crypto'

export const AUTH_COOKIE = 'nerixi_session'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 jours

export const AUTH_EMAIL = (process.env.AUTH_EMAIL || 'info@nerixi.com').toLowerCase()

const DEFAULT_PASSWORD = 'Nerixi@CRM-2026!'
const PASSWORD = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD

const SECRET = process.env.AUTH_SECRET
  || crypto.createHash('sha256').update('nerixi-default-secret-' + PASSWORD).digest('hex')

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function verifyCredentials(email, password) {
  if (!email || !password) return false
  const okEmail = timingSafeEqualStr(String(email).toLowerCase(), AUTH_EMAIL)
  const okPwd   = timingSafeEqualStr(String(password), PASSWORD)
  return okEmail && okPwd
}

function sign(payload) {
  return crypto.createHmac('sha256', SECRET).update(payload).digest('base64url')
}

export function createToken(email) {
  const exp = Date.now() + COOKIE_MAX_AGE * 1000
  const payload = `${email}.${exp}`
  const sig = sign(payload)
  return `${Buffer.from(payload).toString('base64url')}.${sig}`
}

export function verifyToken(token) {
  if (!token || typeof token !== 'string') return null
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null

  let payload
  try { payload = Buffer.from(payloadB64, 'base64url').toString('utf8') }
  catch { return null }

  const expected = sign(payload)
  if (!timingSafeEqualStr(sig, expected)) return null

  const [email, expStr] = payload.split('.')
  const exp = Number(expStr)
  if (!exp || Date.now() > exp) return null
  if (email.toLowerCase() !== AUTH_EMAIL) return null

  return { email, exp }
}
