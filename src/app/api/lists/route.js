import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getLists, saveList } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ lists: getLists() })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await request.json()
    if (!payload.name) return Response.json({ error: 'name requis' }, { status: 400 })
    const list = saveList(payload)
    return Response.json({ list })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
