import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getAuditLog } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const limit = Math.min(500, Math.max(10, Number(url.searchParams.get('limit')) || 200))
  const log = await getAuditLog(limit)
  return Response.json({ log })
}
