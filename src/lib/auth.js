import crypto from 'crypto'

export const AUTH_COOKIE = 'nerixi_session_v2'
export const COOKIE_MAX_AGE = 60 * 60 * 24 * 7 // 7 jours

const DEFAULT_PASSWORD = 'Nerixi@CRM-2026!'

function getEmail() {
  return (process.env.AUTH_EMAIL || 'info@nerixi.com').toLowerCase()
}

function getPassword() {
  return process.env.AUTH_PASSWORD || DEFAULT_PASSWORD
}

function getSecret() {
  if (process.env.AUTH_SECRET) return process.env.AUTH_SECRET
  return crypto.createHash('sha256').update('nerixi-default-secret-' + getPassword()).digest('hex')
}

// Backwards-compatible export — some routes may still import this constant.
export const AUTH_EMAIL = getEmail()

function timingSafeEqualStr(a, b) {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return crypto.timingSafeEqual(ba, bb)
}

export function verifyCredentials(email, password) {
  if (!email || !password) return false
  const okEmail = timingSafeEqualStr(String(email).toLowerCase(), getEmail())
  const okPwd   = timingSafeEqualStr(String(password), getPassword())
  return okEmail && okPwd
}

function sign(payload) {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url')
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

  // Split on LAST dot — email may contain dots (info@nerixi.com)
  const lastDot = payload.lastIndexOf('.')
  if (lastDot === -1) return null
  const email = payload.slice(0, lastDot)
  const expStr = payload.slice(lastDot + 1)
  const exp = Number(expStr)
  if (!exp || Date.now() > exp) return null
  if (email.toLowerCase() !== getEmail()) return null

  return { email, exp }
}
