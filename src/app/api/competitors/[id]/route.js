import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { saveCompetitor, deleteCompetitor, getCompetitors } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const c = await saveCompetitor({ ...body, id: params.id })
  return Response.json({ competitor: c })
}

export async function DELETE(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteCompetitor(params.id)
  return Response.json({ success: true })
}

export async function GET(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const list = await getCompetitors()
  const c = list.find(x => x.id === params.id)
  if (!c) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ competitor: c })
}
