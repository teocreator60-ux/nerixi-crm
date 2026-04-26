import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getEvents, createEvent } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ events: await getEvents() })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await request.json()
    if (!payload.date || !payload.title) {
      return Response.json({ error: 'date et title requis' }, { status: 400 })
    }
    const event = await createEvent(payload)
    return Response.json({ event })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
