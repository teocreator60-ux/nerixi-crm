import crypto from 'crypto'
import { emitEvent } from '@/lib/eventBus'
import { runWorkflowsForEvent } from '@/lib/workflows'
import { getClients, logActivity, findPaymentLinkByStripeId, savePaymentLink, createClient, updateClient, getQuote, saveQuote } from '@/lib/store'

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

async function findClientByEmail(email) {
  if (!email) return null
  const norm = email.toLowerCase().trim()
  const clients = await getClients()
  return clients.find(c => (c.email || '').toLowerCase().trim() === norm) || null
}

async function triggerN8nOnboarding(client) {
  const url = process.env.N8N_ONBOARDING_WEBHOOK_URL
  if (!url) return { status: 'skipped', error: 'N8N_ONBOARDING_WEBHOOK_URL non configuré' }

  const event = {
    event: 'client.onboarding_started',
    timestamp: new Date().toISOString(),
    source: 'nerixi-crm',
    triggeredBy: 'stripe_payment',
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
    headers['X-Nerixi-Signature'] = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`
    headers['X-Nerixi-Timestamp'] = event.timestamp
  }
  try {
    const res = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { status: 'failed', error: `n8n ${res.status}` }
    return { status: 'sent', triggeredAt: event.timestamp }
  } catch (e) {
    return { status: 'failed', error: e.message || 'Erreur réseau' }
  }
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
  let client = await findClientByEmail(email)

  let normalizedType = null
  if (event.type === 'charge.succeeded' || event.type === 'payment_intent.succeeded') normalizedType = 'payment.received'
  else if (event.type === 'charge.failed' || event.type === 'payment_intent.payment_failed') normalizedType = 'payment.failed'
  else if (event.type === 'charge.refunded') normalizedType = 'payment.refunded'

  // Auto-onboarding : si paiement reçu d'un email inconnu, créer le client + déclencher n8n
  let autoOnboarded = false
  if (normalizedType === 'payment.received' && !client && email) {
    const customerName = obj.billing_details?.name || obj.customer_details?.name || ''
    client = await createClient({
      nom: customerName,
      entreprise: customerName || email.split('@')[0],
      email,
      telephone: obj.billing_details?.phone || obj.customer_details?.phone || '',
      statut: 'actif',
      mrr: Math.round(amount / 100),
      installation: 0,
      dateDebut: new Date().toISOString().slice(0, 10),
      avancement: 0,
      notes: `Client créé automatiquement via paiement Stripe (${obj.id})`,
      tags: ['stripe-auto'],
    })
    autoOnboarded = true

    const onboardingResult = await triggerN8nOnboarding(client)
    await updateClient(client.id, {
      ...client,
      onboarding: {
        triggeredAt: onboardingResult.triggeredAt || new Date().toISOString(),
        status: onboardingResult.status,
        error: onboardingResult.error || null,
      },
    })
    await logActivity({
      clientId: client.id,
      type: 'onboarding_triggered',
      payload: { status: onboardingResult.status, error: onboardingResult.error, triggeredBy: 'stripe_payment' },
    })
  }

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
      autoOnboarded,
    })

    if (client) {
      await logActivity({
        clientId: client.id,
        type: normalizedType === 'payment.received' ? 'stripe_succeeded' : (normalizedType === 'payment.failed' ? 'stripe_failed' : 'stripe_refunded'),
        payload: { amount, currency: obj.currency || 'eur', stripeId: obj.id },
      })
    }

    // Mark matching payment_link as paid (via metadata)
    const linkStripeId = obj.metadata?.payment_link || obj.payment_link
    if (linkStripeId && normalizedType === 'payment.received') {
      const existing = await findPaymentLinkByStripeId(linkStripeId)
      if (existing) {
        await savePaymentLink({ ...existing, status: 'paid', paidAt: new Date().toISOString() })
      }
    }

    // Mark matching quote as paid (via metadata.quoteId)
    const quoteId = obj.metadata?.quoteId
    if (quoteId && normalizedType === 'payment.received') {
      const quote = await getQuote(quoteId)
      if (quote && !quote.paidAt) {
        await saveQuote({ ...quote, status: 'paid', paidAt: new Date().toISOString() })
        if (quote.clientId) {
          await logActivity({
            clientId: quote.clientId,
            type: 'quote_paid',
            payload: { quoteId, quoteNumber: quote.quoteNumber, amount: quote.total },
          })
        }
      }
    }

    try { await runWorkflowsForEvent(normalizedType, { client, amount, stripe: obj }) } catch {}
  }

  return Response.json({ received: true })
}
