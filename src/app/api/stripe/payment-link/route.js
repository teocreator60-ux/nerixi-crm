import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getClient, savePaymentLink, logActivity } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

async function stripeForm(path, params, secret) {
  const body = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v == null) return
    if (Array.isArray(v)) v.forEach((it, i) => {
      if (typeof it === 'object') Object.entries(it).forEach(([k2, v2]) => body.append(`${k}[${i}][${k2}]`, String(v2)))
      else body.append(`${k}[${i}]`, String(it))
    })
    else if (typeof v === 'object') Object.entries(v).forEach(([k2, v2]) => body.append(`${k}[${k2}]`, String(v2)))
    else body.append(k, String(v))
  })
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `Stripe ${res.status}`)
  return data
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const secret = process.env.STRIPE_SECRET_KEY
  if (!secret) return Response.json({ error: 'STRIPE_SECRET_KEY non configuré' }, { status: 503 })

  let payload = {}
  try { payload = await request.json() } catch {}

  const clientId = Number(payload.clientId)
  const amount = Number(payload.amount) // in euros
  const description = (payload.description || '').trim()
  if (!clientId || !amount || amount <= 0) {
    return Response.json({ error: 'clientId et amount (>0) requis' }, { status: 400 })
  }

  const client = await getClient(clientId)
  if (!client) return Response.json({ error: 'Client introuvable' }, { status: 404 })

  const productName = description || `Prestation Nerixi · ${client.entreprise}`
  const invoiceNumber = `NRX-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`

  try {
    // 1) Create product
    const product = await stripeForm('/products', {
      name: productName,
      'metadata[clientId]': String(clientId),
      'metadata[invoiceNumber]': invoiceNumber,
    }, secret)

    // 2) Create price (one-time, in cents)
    const price = await stripeForm('/prices', {
      product: product.id,
      unit_amount: Math.round(amount * 100),
      currency: 'eur',
    }, secret)

    // 3) Create payment link
    const link = await stripeForm('/payment_links', {
      'line_items': [{ price: price.id, quantity: 1 }],
      'metadata[clientId]': String(clientId),
      'metadata[invoiceNumber]': invoiceNumber,
      'after_completion[type]': 'redirect',
      'after_completion[redirect][url]': payload.successUrl || (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000') + '/?paid=1',
    }, secret)

    const saved = await savePaymentLink({
      clientId,
      stripeId: link.id,
      url: link.url,
      amount,
      currency: 'eur',
      description: productName,
      status: 'created',
      invoiceNumber,
    })

    await logActivity({
      clientId,
      type: 'payment_link_created',
      payload: { linkId: saved.id, amount, description: productName, invoiceNumber },
    })

    return Response.json({ paymentLink: saved })
  } catch (e) {
    return Response.json({ error: e.message || 'Erreur Stripe' }, { status: 500 })
  }
}
