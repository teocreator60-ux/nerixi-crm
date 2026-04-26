import crypto from 'crypto'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getClient, updateClient, deleteClient } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

async function fireStatusWebhook(client, fromStatus) {
  const url = process.env.N8N_STATUS_WEBHOOK_URL
  if (!url) return null
  const event = {
    event: 'client.status_changed',
    timestamp: new Date().toISOString(),
    source: 'nerixi-crm',
    transition: { from: fromStatus, to: client.statut },
    client: {
      id: client.id, nom: client.nom, entreprise: client.entreprise, secteur: client.secteur,
      email: client.email, telephone: client.telephone, statut: client.statut,
      mrr: client.mrr, installation: client.installation, dateDebut: client.dateDebut,
      avancement: client.avancement, automatisations: client.automatisations,
      tags: client.tags, linkedin: client.linkedin,
    },
  }
  const body = JSON.stringify(event)
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Nerixi-CRM/1.0' }
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (secret) {
    headers['X-Nerixi-Signature'] = `sha256=${sign(body, secret)}`
    headers['X-Nerixi-Timestamp'] = event.timestamp
  }
  try {
    await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(8000) })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e.message }
  }
}

export async function GET(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const c = await getClient(params.id)
  if (!c) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ client: c })
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = await request.json()
    const result = await updateClient(params.id, patch)
    if (!result) return Response.json({ error: 'Not found' }, { status: 404 })

    let webhook = null
    if (result.statusChanged) {
      webhook = await fireStatusWebhook(result.client, result.previousStatus)
      const { runWorkflowsForEvent } = await import('@/lib/workflows')
      runWorkflowsForEvent('client.status_changed', {
        client: result.client,
        from: result.previousStatus,
        to: result.client.statut,
      }).catch(() => {})
    }

    return Response.json({
      client: result.client,
      statusChanged: !!result.statusChanged,
      previousStatus: result.previousStatus,
      webhook,
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const ok = await deleteClient(params.id)
  return Response.json({ success: ok })
}
