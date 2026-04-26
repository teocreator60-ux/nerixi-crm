import { saveInboundEmail, findClientByEmail, logActivity } from '@/lib/store'
import { emitEvent } from '@/lib/eventBus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Optional: vérification d'un secret partagé Brevo si configuré
function verifySecret(request) {
  const expected = process.env.BREVO_INBOUND_SECRET
  if (!expected) return true
  const got = request.headers.get('x-nerixi-inbound-secret') || request.nextUrl?.searchParams.get('secret')
  return got === expected
}

function extractEmail(addr) {
  if (!addr) return ''
  if (typeof addr === 'string') return addr.trim()
  if (addr.Address) return addr.Address.trim()
  if (addr.address) return addr.address.trim()
  if (addr.email) return addr.email.trim()
  return ''
}

function extractName(addr) {
  if (!addr) return ''
  if (typeof addr === 'object') return (addr.Name || addr.name || '').trim()
  return ''
}

export async function POST(request) {
  if (!verifySecret(request)) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body
  try { body = await request.json() } catch {
    return Response.json({ error: 'Bad payload' }, { status: 400 })
  }

  // Brevo Inbound Parsing payload structure (single message OR array)
  const items = Array.isArray(body) ? body : (Array.isArray(body.items) ? body.items : [body])
  const saved = []

  for (const item of items) {
    const fromObj = item.From || item.from || {}
    const fromEmail = extractEmail(fromObj) || extractEmail(item.fromEmail || item.sender)
    const fromName  = extractName(fromObj) || (item.fromName || '')
    const toArr     = item.To || item.to || []
    const toEmail   = Array.isArray(toArr) ? extractEmail(toArr[0]) : extractEmail(toArr)
    const subject   = item.Subject || item.subject || '(sans objet)'
    const text      = item.RawTextBody || item.TextBody || item.text || ''
    const html      = item.RawHtmlBody || item.HtmlBody || item.html || ''
    const receivedAt = item.SentAtDate || item.receivedAt || new Date().toISOString()

    const client = findClientByEmail(fromEmail)
    const email = saveInboundEmail({
      clientId: client?.id || null,
      fromEmail, fromName,
      toEmail,
      subject, text, html,
      receivedAt,
      read: false,
    })
    saved.push(email)

    if (client) {
      logActivity({
        clientId: client.id,
        type: 'email_received',
        payload: { subject, from: fromEmail, emailId: email.id },
      })
    }

    emitEvent({
      type: 'inbox.email_received',
      email: { id: email.id, fromEmail, fromName, subject },
      client: client ? { id: client.id, entreprise: client.entreprise } : null,
      assigned: !!client,
    })
  }

  return Response.json({ ok: true, saved: saved.length })
}

export async function GET() {
  return Response.json({ status: 'ok', message: 'Brevo inbound webhook endpoint. POST only.' })
}
