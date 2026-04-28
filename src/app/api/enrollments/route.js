import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getEnrollments, saveEnrollment, getSequences } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const sequenceId = url.searchParams.get('sequenceId')
  const status = url.searchParams.get('status')
  const list = await getEnrollments({ sequenceId, status })
  return Response.json({ enrollments: list })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  if (!body.sequenceId || !body.recipientEmail) {
    return Response.json({ error: 'sequenceId et recipientEmail requis' }, { status: 400 })
  }
  const sequences = await getSequences()
  const seq = sequences.find(s => s.id === body.sequenceId)
  if (!seq) return Response.json({ error: 'Sequence introuvable' }, { status: 404 })

  // First step is sent immediately (nextSendAt = now)
  const enr = await saveEnrollment({
    sequenceId: body.sequenceId,
    recipientEmail: body.recipientEmail,
    recipientName: body.recipientName || '',
    clientId: body.clientId || null,
    prospectId: body.prospectId || null,
    currentStep: 0,
    nextSendAt: new Date().toISOString(),
    status: 'active',
  })
  return Response.json({ enrollment: enr })
}
