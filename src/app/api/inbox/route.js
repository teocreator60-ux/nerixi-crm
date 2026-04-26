import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getInboundEmails, getOutboundEmails, getClients } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const clientId = searchParams.get('clientId')
  if (clientId) {
    return Response.json({
      inbound: getInboundEmails(clientId),
      outbound: getOutboundEmails(clientId),
    })
  }
  return Response.json({
    inbound: getInboundEmails(),
    outbound: getOutboundEmails(),
  })
}
