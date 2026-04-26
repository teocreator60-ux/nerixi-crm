import { savePageview, findClientByEmail } from '@/lib/store'
import { emitEvent } from '@/lib/eventBus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const ALLOWED_KEY_PARAM = 'ncid' // Nerixi Client ID UTM param
const ALLOWED_EMAIL_PARAM = 'nemail'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders() })
}

export async function POST(request) {
  let body = {}
  try { body = await request.json() } catch {}

  const sid = body.sid
  const url = body.url || ''
  const title = body.title || ''
  const referrer = body.referrer || ''
  if (!sid) return Response.json({ error: 'sid manquant' }, { status: 400, headers: corsHeaders() })

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
            || request.headers.get('x-real-ip')
            || null
  const ua = request.headers.get('user-agent') || ''

  // Auto-identify from URL params
  let clientId = body.clientId || null
  let identifiedEmail = body.email || null
  try {
    if (url) {
      const u = new URL(url, 'https://x')
      const ncid = u.searchParams.get(ALLOWED_KEY_PARAM)
      if (ncid && !clientId) clientId = Number(ncid)
      const email = u.searchParams.get(ALLOWED_EMAIL_PARAM)
      if (email && !identifiedEmail) identifiedEmail = email
    }
  } catch {}

  if (identifiedEmail && !clientId) {
    const c = await findClientByEmail(identifiedEmail)
    if (c) clientId = c.id
  }

  const pv = await savePageview({ sid, url, title, referrer, ip, ua, clientId, identifiedEmail })

  // Live event for the dashboard
  emitEvent({
    type: 'visitor.page',
    pageview: { sid: pv.sid, url, title, ts: pv.ts, ip, clientId, identifiedEmail },
  })

  // Push notif if known visitor on a high-value page
  const isHotPage = /tarifs|pricing|contact|demo|rdv|devis/i.test(url)
  if (isHotPage && (clientId || identifiedEmail)) {
    emitEvent({
      type: 'visitor.hot',
      pageview: { sid: pv.sid, url, title, clientId, identifiedEmail },
    })
  }

  return Response.json({ ok: true }, { headers: corsHeaders() })
}
