import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getClient, updateClient, deleteClient } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const c = getClient(params.id)
  if (!c) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ client: c })
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = await request.json()
    const updated = updateClient(params.id, patch)
    if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ client: updated })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const ok = deleteClient(params.id)
  return Response.json({ success: ok })
}
