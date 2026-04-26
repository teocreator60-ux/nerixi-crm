import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getTasks, createTask } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  return Response.json({ tasks: getTasks(clientId) })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await request.json()
    if (!payload.title) return Response.json({ error: 'title requis' }, { status: 400 })
    const task = createTask(payload)
    return Response.json({ task })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
