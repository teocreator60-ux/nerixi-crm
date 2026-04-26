import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { emitEvent } from '@/lib/eventBus'
import { getClients, logActivity } from '@/lib/store'
import { runWorkflowsForEvent } from '@/lib/workflows'

export async function POST(request) {
  const token = cookies().get(AUTH_COOKIE)?.value
  if (!verifyToken(token)) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let payload = {}
  try { payload = await request.json() } catch {}

  const clients = getClients()
  const client = payload.clientId
    ? clients.find(c => c.id === Number(payload.clientId))
    : clients[Math.floor(Math.random() * clients.length)] || null

  const amount = payload.amount != null ? Number(payload.amount) : (client?.mrr || 1500) * 100
  const event = emitEvent({
    type: 'payment.received',
    source: 'simulated',
    payment: {
      id: `sim_${Date.now()}`,
      amount,
      currency: 'eur',
      status: 'succeeded',
      created: Math.floor(Date.now() / 1000),
      description: client ? `Paiement simulé · ${client.entreprise}` : 'Paiement simulé',
      customer_email: client?.email || null,
      customer_name: client?.nom || null,
    },
    client: client ? {
      id: client.id, nom: client.nom, entreprise: client.entreprise, email: client.email,
    } : null,
  })

  if (client) {
    logActivity({
      clientId: client.id,
      type: 'payment_simulated',
      payload: { amount, currency: 'eur' },
    })
  }

  try { await runWorkflowsForEvent('payment.received', { client, amount, simulated: true }) } catch {}

  return Response.json({ success: true, event })
}
