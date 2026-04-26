import { identifySession, findClientByEmail } from '@/lib/store'

export const dynamic = 'force-dynamic'

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
  if (!sid) return Response.json({ error: 'sid manquant' }, { status: 400, headers: corsHeaders() })

  let clientId = body.clientId ? Number(body.clientId) : null
  const email = body.email || null

  if (email && !clientId) {
    const c = findClientByEmail(email)
    if (c) clientId = c.id
  }

  const updated = identifySession(sid, { clientId, email })

  return Response.json({ ok: true, updated, clientId, email }, { headers: corsHeaders() })
}
