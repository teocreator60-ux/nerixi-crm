import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { saveSequence, deleteSequence, getSequences } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const seq = await saveSequence({ ...body, id: params.id })
  return Response.json({ sequence: seq })
}

export async function DELETE(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteSequence(params.id)
  return Response.json({ success: true })
}

export async function GET(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const list = await getSequences()
  const seq = list.find(s => s.id === params.id)
  if (!seq) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ sequence: seq })
}
