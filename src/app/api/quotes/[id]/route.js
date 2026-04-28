import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getQuote, saveQuote, deleteQuote } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const quote = await getQuote(params.id)
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ quote })
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const cur = await getQuote(params.id)
  if (!cur) return Response.json({ error: 'Not found' }, { status: 404 })
  const quote = await saveQuote({ ...cur, ...body, id: params.id })
  return Response.json({ quote })
}

export async function DELETE(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteQuote(params.id)
  return Response.json({ success: true })
}
