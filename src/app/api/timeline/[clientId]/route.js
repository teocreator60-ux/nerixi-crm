import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getClient, getActivities, getEvents } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const id = Number(params.clientId)
  const [client, activitiesRaw, eventsAll] = await Promise.all([
    getClient(id),
    getActivities(id),
    getEvents(),
  ])
  if (!client) return Response.json({ error: 'Not found' }, { status: 404 })

  const activities = activitiesRaw.map(a => ({
    id: a.id,
    ts: a.ts,
    type: a.type,
    payload: a.payload,
  }))

  const events = eventsAll
    .filter(e => e.clientId === id)
    .map(e => ({
      id: e.id,
      ts: `${e.date}T${e.time || '09:00'}:00`,
      type: e.done ? 'event_done' : 'event_scheduled',
      payload: { title: e.title, type: e.type, time: e.time, notes: e.notes, done: e.done },
    }))

  const merged = [...activities, ...events].sort((a, b) => b.ts.localeCompare(a.ts))

  return Response.json({ client, timeline: merged })
}
