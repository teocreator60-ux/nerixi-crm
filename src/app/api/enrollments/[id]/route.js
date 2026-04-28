import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { saveEnrollment, deleteEnrollment, getEnrollments } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function PATCH(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const list = await getEnrollments()
  const cur = list.find(e => e.id === params.id)
  if (!cur) return Response.json({ error: 'Not found' }, { status: 404 })
  const enr = await saveEnrollment({ ...cur, ...body, id: params.id })
  return Response.json({ enrollment: enr })
}

export async function DELETE(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteEnrollment(params.id)
  return Response.json({ success: true })
}
