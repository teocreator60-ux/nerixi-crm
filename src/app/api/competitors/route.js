import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getCompetitors, saveCompetitor } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ competitors: await getCompetitors() })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const c = await saveCompetitor(body)
  return Response.json({ competitor: c })
}
