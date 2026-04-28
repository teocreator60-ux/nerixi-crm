import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getQuote, saveQuote, savePaymentLink, logActivity } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function getBaseUrl(request) {
  const env = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL
  if (env) return env.replace(/\/$/, '')
  const proto = request.headers.get('x-forwarded-proto') || 'https'
  const host = request.headers.get('host')
  return `${proto}://${host}`
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

export async function POST(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  let quote = await getQuote(params.id)
  if (!quote) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!quote.recipientEmail) return Response.json({ error: 'Email destinataire manquant' }, { status: 400 })

  const baseUrl = getBaseUrl(request)
  const publicUrl = `${baseUrl}/quote/${quote.token}`

  // Generate Stripe Payment Link if not yet generated and total > 0
  const stripeSecret = process.env.STRIPE_SECRET_KEY
  let paymentLinkUrl = quote.paymentLinkUrl
  let paymentLinkId = quote.paymentLinkId
  const upfront = (Number(quote.installation) || quote.total)
  if (stripeSecret && upfront > 0 && !paymentLinkUrl) {
    try {
      const product = await stripeForm('/products', {
        name: `${quote.title} — ${quote.company || quote.recipientName}`,
        'metadata[quoteId]': quote.id,
        'metadata[quoteNumber]': quote.quoteNumber,
      }, stripeSecret)
      const price = await stripeForm('/prices', {
        product: product.id,
        unit_amount: Math.round(upfront * 100),
        currency: 'eur',
      }, stripeSecret)
      const link = await stripeForm('/payment_links', {
        'line_items': [{ price: price.id, quantity: 1 }],
        'metadata[quoteId]': quote.id,
        'metadata[quoteNumber]': quote.quoteNumber,
        'after_completion[type]': 'redirect',
        'after_completion[redirect][url]': `${publicUrl}?paid=1`,
      }, stripeSecret)
      const saved = await savePaymentLink({
        clientId: quote.clientId,
        stripeId: link.id,
        url: link.url,
        amount: upfront,
        currency: 'eur',
        description: `Devis ${quote.quoteNumber}`,
        status: 'created',
        invoiceNumber: quote.quoteNumber,
      })
      paymentLinkId = saved.id
      paymentLinkUrl = link.url
    } catch (e) {
      // Continue without payment link if Stripe fails
    }
  }

  // Send email with link to public quote page
  const subject = `Votre devis ${quote.quoteNumber} — Nerixi`
  const total = (quote.total || 0).toLocaleString('fr-FR')
  const content = `
    <p>Bonjour ${quote.recipientName || ''},</p>
    <p>Je vous prie de trouver ci-dessous votre devis personnalisé Nerixi.</p>
    <p style="background:#f4f4f4;padding:16px;border-radius:8px;border-left:4px solid #00c878;margin:20px 0">
      <strong>${quote.title}</strong><br>
      Numéro : ${quote.quoteNumber}<br>
      Total TTC : <strong>${total} €</strong>
      ${quote.monthly ? `<br>Abonnement mensuel : ${(quote.monthly).toLocaleString('fr-FR')} €/mois` : ''}
    </p>
    <p style="text-align:center;margin:24px 0">
      <a href="${publicUrl}" class="btn">📄 Consulter et signer le devis</a>
    </p>
    <p>Vous pouvez consulter, signer électroniquement et régler le devis directement en ligne en cliquant sur le bouton ci-dessus.</p>
    ${quote.notes ? `<p style="font-style:italic;color:#666">${quote.notes}</p>` : ''}
    <p>Belle journée,<br>Téo · Nerixi</p>
  `

  try {
    await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', cookie: request.headers.get('cookie') || '' },
      body: JSON.stringify({
        to: quote.recipientEmail,
        toName: quote.recipientName || '',
        subject, content, track: true,
      }),
    })
  } catch {}

  quote = await saveQuote({
    ...quote,
    status: 'sent',
    sentAt: new Date().toISOString(),
    paymentLinkId, paymentLinkUrl,
  })

  if (quote.clientId) {
    try { await logActivity({ clientId: quote.clientId, type: 'quote_sent', payload: { quoteId: quote.id, quoteNumber: quote.quoteNumber, total: quote.total } }) } catch {}
  }

  return Response.json({ quote, publicUrl })
}
