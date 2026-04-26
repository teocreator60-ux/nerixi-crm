import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getRecentSessions } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ sessions: getRecentSessions(50) })
}
