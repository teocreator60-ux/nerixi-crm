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

  const event = {
    event: 'linkedin.regenerate',
    timestamp: new Date().toISOString(),
    source: 'nerixi-crm',
    title: payload.title || '',
    topic: payload.topic || payload.title || '',
    currentContent: payload.currentContent || '',
    angle: payload.angle || '',
  }

  const body = JSON.stringify(event)
  const headers = { 'Content-Type': 'application/json', 'User-Agent': 'Nerixi-CRM/1.0' }
  const secret = process.env.N8N_WEBHOOK_SECRET
  if (secret) {
    headers['X-Nerixi-Signature'] = `sha256=${sign(body, secret)}`
    headers['X-Nerixi-Timestamp'] = event.timestamp
  }

  let errorMsg = null
  let generated = null
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(30000) })
    const text = await res.text()
    if (!res.ok) {
      errorMsg = `n8n a répondu ${res.status} : ${text.slice(0, 200)}`
    } else {
      try {
        const json = JSON.parse(text)
        generated = json.content || json.text || json.post || json.output || json.message || (typeof json === 'string' ? json : null)
        if (!generated && Array.isArray(json) && json[0]) {
          generated = json[0].content || json[0].text || json[0].output
        }
      } catch {
        generated = text
      }
    }
  } catch (e) {
    errorMsg = e.name === 'TimeoutError' ? 'Timeout n8n (>30s)' : (e.message || 'Erreur réseau')
  }

  logActivity({
    type: 'linkedin_regenerated',
    payload: { title: payload.title, status: errorMsg ? 'failed' : 'sent', error: errorMsg, length: generated?.length || 0 },
  })

  if (errorMsg) return Response.json({ error: errorMsg }, { status: 502 })
  if (!generated) return Response.json({ error: 'n8n n\'a pas retourné de contenu (champ "content" attendu dans la réponse)' }, { status: 502 })

  return Response.json({ success: true, content: generated })
}
