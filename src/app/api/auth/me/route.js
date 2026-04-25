import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export async function GET() {
  const token = cookies().get(AUTH_COOKIE)?.value
  const session = verifyToken(token)
  if (!session) {
    return Response.json({ authed: false }, { status: 200 })
  }
  return Response.json({ authed: true, email: session.email })
}
