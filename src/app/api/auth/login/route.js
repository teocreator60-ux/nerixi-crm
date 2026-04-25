import { cookies } from 'next/headers'
import { verifyCredentials, createToken, AUTH_COOKIE, COOKIE_MAX_AGE } from '@/lib/auth'

export async function POST(request) {
  try {
    const { email, password } = await request.json()

    await new Promise(r => setTimeout(r, 400))

    if (!verifyCredentials(email, password)) {
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

    return Response.json({ success: true })
  } catch (e) {
    return Response.json({ error: 'Requête invalide' }, { status: 400 })
  }
}
