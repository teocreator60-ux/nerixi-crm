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
  const upfrontFmt = (upfront || 0).toLocaleString('fr-FR')
  const content = `
    <p>Bonjour ${quote.recipientName || ''},</p>
    <p>Suite à nos échanges, voici votre devis personnalisé <strong>Nerixi</strong>.</p>
    <div style="background:#f4f4f4;padding:18px;border-radius:8px;border-left:4px solid #00c878;margin:20px 0">
      <p style="margin:0 0 6px"><strong>${quote.title}</strong></p>
      <p style="margin:0;font-size:13px;color:#666">Devis n° ${quote.quoteNumber}</p>
      <p style="margin:8px 0 0;font-size:18px"><strong>Total TTC : ${total} €</strong></p>
      ${quote.installation ? `<p style="margin:4px 0 0;font-size:13px;color:#666">Acompte à la signature : ${upfrontFmt} €</p>` : ''}
      ${quote.monthly ? `<p style="margin:4px 0 0;font-size:13px;color:#666">Abonnement mensuel : ${(quote.monthly).toLocaleString('fr-FR')} €/mois</p>` : ''}
    </div>
    <p style="text-align:center;margin:28px 0">
      <a href="${publicUrl}" class="btn" style="display:inline-block;background:#00c878;color:#0a1628;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700">📄 Consulter, signer & payer le devis</a>
    </p>
    <p>Vous pouvez consulter le détail, signer électroniquement et régler le devis directement en ligne en cliquant sur le bouton ci-dessus.</p>
    ${quote.notes ? `<p style="font-style:italic;color:#666;border-top:1px solid #eee;padding-top:12px;margin-top:18px">${quote.notes}</p>` : ''}
    ${quote.validUntil ? `<p style="font-size:12px;color:#888">⏰ Devis valable jusqu'au ${new Date(quote.validUntil).toLocaleDateString('fr-FR')}</p>` : ''}
    <p style="margin-top:24px">À très vite,<br><strong>Téo · Nerixi</strong></p>
  `

  let sendError = null
  try {
    const sendRes = await fetch(`${baseUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: quote.recipientEmail,
        toName: quote.recipientName || '',
        subject, content, track: true,
      }),
    })
    const sendData = await sendRes.json().catch(() => ({}))
    if (!sendRes.ok || !sendData.success) {
      sendError = sendData.error || `Erreur ${sendRes.status}`
    }
  } catch (e) {
    sendError = e.message || 'Erreur réseau Brevo'
  }

  if (sendError) {
    return Response.json({
      error: `Email non envoyé : ${sendError}. Vérifie BREVO_API_KEY dans Vercel.`,
      quote, publicUrl, paymentLinkUrl,
    }, { status: 502 })
  }

  quote = await saveQuote({
    ...quote,
    status: 'sent',
    sentAt: new Date().toISOString(),
    paymentLinkId, paymentLinkUrl,
  })

  if (quote.clientId) {
    try { await logActivity({ clientId: quote.clientId, type: 'quote_sent', payload: { quoteId: quote.id, quoteNumber: quote.quoteNumber, total: quote.total } }) } catch {}
  }

  return Response.json({ success: true, quote, publicUrl })
}
