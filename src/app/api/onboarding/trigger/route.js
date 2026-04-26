import crypto from 'crypto'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getClient, updateClient } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.N8N_ONBOARDING_WEBHOOK_URL
  if (!url) {
    return Response.json(
      { error: 'N8N_ONBOARDING_WEBHOOK_URL non configuré dans .env.local' },
      { status: 503 }
    )
  }

  let payload
  try { payload = await request.json() } catch { payload = {} }

  const clientId = payload.clientId
  if (!clientId) return Response.json({ error: 'clientId requis' }, { status: 400 })

  const client = getClient(clientId)
  if (!client) return Response.json({ error: 'Client introuvable' }, { status: 404 })

  const event = {
    event: 'client.onboarding_started',
    timestamp: new Date().toISOString(),
    source: 'nerixi-crm',
    triggeredBy: payload.triggeredBy || 'manual',
    client: {
      id: client.id,
      nom: client.nom,
      entreprise: client.entreprise,
      secteur: client.secteur,
      email: client.email,
      telephone: client.telephone,
      statut: client.statut,
      mrr: client.mrr,
      installation: client.installation,
      dateDebut: client.dateDebut,
      automatisations: client.automatisations,
      prochainAction: client.prochainAction,
      linkedin: client.linkedin,
      tags: client.tags,
      notes: client.notes,
    },
  }

  const body = JSON.stringify(event)
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Nerixi-CRM/1.0' }

  const secret = process.env.N8N_WEBHOOK_SECRET
  if (secret) {
    headers['X-Nerixi-Signature'] = `sha256=${sign(body, secret)}`
    headers['X-Nerixi-Timestamp'] = event.timestamp
  }

  let n8nResponse, errorMsg
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    if (!res.ok) {
      errorMsg = `n8n a répondu ${res.status} : ${text.slice(0, 200)}`
    } else {
      try { n8nResponse = JSON.parse(text) } catch { n8nResponse = text }
    }
  } catch (e) {
    errorMsg = e.name === 'TimeoutError' ? 'Timeout n8n (>10s)' : (e.message || 'Erreur réseau')
  }

  const onboarding = {
    triggeredAt: event.timestamp,
    status: errorMsg ? 'failed' : 'sent',
    error: errorMsg || null,
    response: !errorMsg && n8nResponse ? n8nResponse : null,
  }

  const result = updateClient(clientId, { ...client, onboarding })
  const updated = result?.client || null

  // Log onboarding activity
  const { logActivity } = await import('@/lib/store')
  logActivity({
    clientId,
    type: 'onboarding_triggered',
    payload: { status: errorMsg ? 'failed' : 'sent', error: errorMsg, triggeredBy: payload.triggeredBy || 'manual' },
  })

  if (!errorMsg) {
    const { runWorkflowsForEvent } = await import('@/lib/workflows')
    runWorkflowsForEvent('onboarding.triggered', { client }).catch(() => {})
  }

  if (errorMsg) {
    return Response.json({ error: errorMsg, client: updated }, { status: 502 })
  }
  return Response.json({ success: true, client: updated, response: n8nResponse })
}
