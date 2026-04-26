import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getPayments, setPaymentStatus } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ payments: await getPayments() })
}

export async function PUT(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { id, status } = await request.json()
    const updated = await setPaymentStatus(id, status)
    if (!updated) return Response.json({ error: 'Not found' }, { status: 404 })
    return Response.json({ payment: updated })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
