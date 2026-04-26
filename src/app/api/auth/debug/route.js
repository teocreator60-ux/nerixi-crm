import crypto from 'crypto'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export const dynamic = 'force-dynamic'

const DEFAULT_PASSWORD = 'Nerixi@CRM-2026!'

function reproSecret() {
  if (process.env.AUTH_SECRET) return { secret: process.env.AUTH_SECRET, source: 'env_AUTH_SECRET' }
  const pwd = process.env.AUTH_PASSWORD || DEFAULT_PASSWORD
  return {
    secret: crypto.createHash('sha256').update('nerixi-default-secret-' + pwd).digest('hex'),
    source: process.env.AUTH_PASSWORD ? 'env_AUTH_PASSWORD' : 'default',
    password_used: pwd,
  }
}

export async function GET() {
  const all = cookies().getAll()
  const cookie = cookies().get(AUTH_COOKIE)
  const token = cookie?.value

  let parts = null
  let payloadDecoded = null
  let actualSig = null
  let expectedSig = null
  if (token) {
    parts = token.split('.')
    actualSig = parts[1] || null
    if (parts[0]) {
      try { payloadDecoded = Buffer.from(parts[0], 'base64url').toString('utf8') } catch {}
    }
    if (payloadDecoded) {
      const sec = reproSecret()
      expectedSig = crypto.createHmac('sha256', sec.secret).update(payloadDecoded).digest('base64url')
    }
  }

  const session = verifyToken(token)
  const secInfo = reproSecret()

  return Response.json({
    cookie_name_expected: AUTH_COOKIE,
    has_cookie: !!cookie,
    all_cookie_names: all.map(c => c.name),
    token_present: !!token,
    payload_decoded: payloadDecoded,
    signatures_match: actualSig && expectedSig ? actualSig === expectedSig : null,
    actual_signature: actualSig?.slice(0, 20) + '…',
    expected_signature: expectedSig?.slice(0, 20) + '…',
    verify_token_result: session,
    secret_source: secInfo.source,
    secret_first8: secInfo.secret.slice(0, 8),
    server_expects_email: process.env.AUTH_EMAIL || 'info@nerixi.com',
    has_auth_password_env: !!process.env.AUTH_PASSWORD,
    has_auth_secret_env: !!process.env.AUTH_SECRET,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  })
}
