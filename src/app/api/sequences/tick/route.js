import { getEnrollments, getSequences, saveEnrollment, logActivity } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function authorize(request) {
  const expected = process.env.CRON_SECRET
  if (!expected) return true
  const auth = request.headers.get('authorization') || ''
  return auth === `Bearer ${expected}`
}

function getBaseUrl(request) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (env) return env.replace(/\/$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host')
  return `${proto}://${host}`
}

function fillTemplate(text, vars) {
  return String(text || '').replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] != null ? vars[k] : '')
}

async function handleTick(request) {
  if (!authorize(request)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const baseUrl = getBaseUrl(request)
  const now = Date.now()
  const sequences = await getSequences()
  const seqMap = Object.fromEntries(sequences.map(s => [s.id, s]))
  const enrolls = await getEnrollments({ status: 'active' })

  let processed = 0, sent = 0, failed = 0, completed = 0

  for (const enr of enrolls) {
    if (new Date(enr.nextSendAt).getTime() > now) continue
    const seq = seqMap[enr.sequenceId]
    if (!seq || !seq.steps?.length) continue
    const step = seq.steps[enr.currentStep]
    if (!step) continue

    processed++
    const vars = {
      nom: enr.recipientName || enr.recipientEmail.split('@')[0],
      email: enr.recipientEmail,
    }
    const subject = fillTemplate(step.subject, vars)
    const content = fillTemplate(step.content, vars)

    try {
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: enr.recipientEmail,
          toName: enr.recipientName,
          subject, content,
          track: true,
          sequenceId: seq.id,
          enrollmentId: enr.id,
        }),
      })
      if (!res.ok) throw new Error(`send-email ${res.status}`)
      sent++

      const history = [...(enr.history || []), { step: enr.currentStep, sentAt: new Date().toISOString(), subject }]
      const nextIdx = enr.currentStep + 1
      const nextStep = seq.steps[nextIdx]
      let next = { ...enr, history }
      if (!nextStep) {
        next.status = 'completed'
        next.completedAt = new Date().toISOString()
        completed++
      } else {
        const dayDiff = Math.max(0, (nextStep.dayOffset || 0) - (step.dayOffset || 0))
        next.currentStep = nextIdx
        next.nextSendAt = new Date(now + dayDiff * 86400000).toISOString()
      }
      await saveEnrollment(next)

      if (enr.clientId) {
        try { await logActivity({ clientId: enr.clientId, type: 'sequence_step_sent', payload: { sequenceId: seq.id, step: enr.currentStep, subject } }) } catch {}
      }
    } catch (e) {
      failed++
      // Retry in 1h
      await saveEnrollment({ ...enr, nextSendAt: new Date(now + 3600 * 1000).toISOString() })
    }
  }

  return Response.json({ ok: true, processed, sent, failed, completed })
}

export async function GET(request) { return handleTick(request) }
export async function POST(request) { return handleTick(request) }
