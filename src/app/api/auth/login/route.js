import { cookies } from 'next/headers'
import { verifyCredentials, createToken, AUTH_COOKIE, COOKIE_MAX_AGE } from '@/lib/auth'
import { logAudit } from '@/lib/store'
import { rateLimit, getClientKey } from '@/lib/rateLimit'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    // Rate limit : max 10 tentatives login / 5 min par IP
    const ip = getClientKey(request)
    const rl = await rateLimit(`login:${ip}`, { limit: 10, windowSec: 300 })
    if (!rl.allowed) {
      return Response.json(
        { error: `Trop de tentatives. Réessaie dans ${rl.resetIn}s.` },
        { status: 429 }
      )
    }

    await new Promise(r => setTimeout(r, 400))

    if (!verifyCredentials(email, password)) {
      try { await logAudit({ actor: email || 'unknown', action: 'login.failed', ip, success: false }) } catch {}
      return Response.json({ error: 'Identifiants invalides' }, { status: 401 })
    }

    const token = createToken(String(email).toLowerCase())

    cookies().set(AUTH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: COOKIE_MAX_AGE,
    })

    try { await logAudit({ actor: String(email).toLowerCase(), action: 'login.success', ip }) } catch {}
    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: 'Requête invalide' }, { status: 400 })
  }
}
