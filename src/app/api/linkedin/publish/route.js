import crypto from 'crypto'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { logActivity } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function sign(body, secret) {
  return crypto.createHmac('sha256', secret).update(body).digest('hex')
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const url = process.env.N8N_LINKEDIN_WEBHOOK_URL
  if (!url) {
    return Response.json(
      { error: 'N8N_LINKEDIN_WEBHOOK_URL non configuré dans .env.local' },
      { status: 503 }
    )
  }

  let payload = {}
  try { payload = await request.json() } catch {}
  if (!payload.content) return Response.json({ error: 'content requis' }, { status: 400 })

  const event = {
    event: 'linkedin.publish',
    timestamp: new Date().toISOString(),
    source: 'nerixi-crm',
    title: payload.title || '',
    content: payload.content,
    scheduledAt: payload.scheduledAt || null,
  }

  const body = JSON.stringify(event)
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Nerixi-CRM/1.0' }
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (secret) {
    headers['X-Nerixi-Signature'] = `sha256=${sign(body, secret)}`
    headers['X-Nerixi-Timestamp'] = event.timestamp
  }

  let errorMsg
  let resBody
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    if (!res.ok) errorMsg = `n8n a répondu ${res.status} : ${text.slice(0, 200)}`
    else { try { resBody = JSON.parse(text) } catch { resBody = text } }
  } catch (e) {
    errorMsg = e.name === 'TimeoutError' ? 'Timeout n8n (>10s)' : (e.message || 'Erreur réseau')
  }

  await logActivity({
    type: 'linkedin_published',
    payload: { title: payload.title, status: errorMsg ? 'failed' : 'sent', error: errorMsg },
  })

  if (errorMsg) return Response.json({ error: errorMsg }, { status: 502 })
  return Response.json({ success: true, response: resBody })
}
