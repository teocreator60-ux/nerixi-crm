import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { markEmailRead, assignEmailToClient, deleteInboundEmail } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = await request.json()
    let updated
    if (patch.read !== undefined) updated = markEmailRead(params.id, patch.read)
    if (patch.clientId !== undefined) updated = assignEmailToClient(params.id, patch.clientId)
    if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ email: updated })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  deleteInboundEmail(params.id)
  return Response.json({ success: true })
}
