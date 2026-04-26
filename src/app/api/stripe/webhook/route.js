import crypto from 'crypto'
import { emitEvent } from '@/lib/eventBus'
import { runWorkflowsForEvent } from '@/lib/workflows'
import { getClients, logActivity, findPaymentLinkByStripeId, savePaymentLink } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function verifyStripeSig(rawBody, header, secret) {
  if (!header || !secret) return false
  const parts = header.split(',').reduce((acc, p) => {
    const [k, v] = p.split('=')
    acc[k] = v
    return acc
  }, {})
  if (!parts.t || !parts.v1) return false
  const signed = `${parts.t}.${rawBody}`
  const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(parts.v1, 'hex'), Buffer.from(expected, 'hex'))
  } catch { return false }
}

function findClientByEmail(email) {
  if (!email) return null
  const norm = email.toLowerCase().trim()
  return getClients().find(c => (c.email || '').toLowerCase().trim() === norm) || null
}

export async function POST(request) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET

  if (secret) {
    if (!verifyStripeSig(rawBody, sig, secret)) {
      return Response.json({ error: 'Invalid signature' }, { status: 400 })
    }
  }

  let event
  try { event = JSON.parse(rawBody) } catch { return Response.json({ error: 'Bad payload' }, { status: 400 }) }

  const obj = event?.data?.object || {}
  const amount = obj.amount_received ?? obj.amount ?? 0
  const email = obj.billing_details?.email || obj.receipt_email || obj.customer_email || null
  const client = findClientByEmail(email)

  let normalizedType = null
  if (event.type === 'charge.succeeded' || event.type === 'payment_intent.succeeded') normalizedType = 'payment.received'
  else if (event.type === 'charge.failed' || event.type === 'payment_intent.payment_failed') normalizedType = 'payment.failed'
  else if (event.type === 'charge.refunded') normalizedType = 'payment.refunded'

  if (normalizedType) {
    emitEvent({
      type: normalizedType,
      source: 'stripe',
      stripeEventType: event.type,
      payment: {
        id: obj.id,
        amount, currency: obj.currency || 'eur',
        status: obj.status,
        created: obj.created || Math.floor(Date.now() / 1000),
        description: obj.description || (client ? `Paiement · ${client.entreprise}` : 'Paiement Stripe'),
        customer_email: email,
        customer_name: obj.billing_details?.name || client?.nom || null,
        receipt_url: obj.receipt_url || null,
      },
      client: client ? { id: client.id, nom: client.nom, entreprise: client.entreprise, email: client.email } : null,
    })

    if (client) {
      logActivity({
        clientId: client.id,
        type: normalizedType === 'payment.received' ? 'stripe_succeeded' : (normalizedType === 'payment.failed' ? 'stripe_failed' : 'stripe_refunded'),
        payload: { amount, currency: obj.currency || 'eur', stripeId: obj.id },
      })
    }

    // Mark matching payment_link as paid (via metadata)
    const linkStripeId = obj.metadata?.payment_link || obj.payment_link
    if (linkStripeId && normalizedType === 'payment.received') {
      const existing = findPaymentLinkByStripeId(linkStripeId)
      if (existing) {
        savePaymentLink({ ...existing, status: 'paid', paidAt: new Date().toISOString() })
      }
    }

    try { await runWorkflowsForEvent(normalizedType, { client, amount, stripe: obj }) } catch {}
  }

  return Response.json({ received: true })
}
