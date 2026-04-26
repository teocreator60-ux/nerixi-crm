import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getClients, createClient } from '@/lib/store'
import { runWorkflowsForEvent } from '@/lib/workflows'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ clients: await getClients() })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await request.json()
    const client = await createClient(payload)
    runWorkflowsForEvent('client.created', { client }).catch(() => {})
    return Response.json({ client })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
