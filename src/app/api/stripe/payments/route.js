const MOCK_PAYMENTS = [
  { id: 'ch_demo_01', amount: 15000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 4,        description: 'Abonnement mensuel · Martin Commerce',     customer_email: 'pierre.martin@martincommerce.fr', customer_name: 'Pierre Martin' },
  { id: 'ch_demo_02', amount: 200000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 26,       description: 'Installation initiale · Martin Commerce',  customer_email: 'pierre.martin@martincommerce.fr', customer_name: 'Pierre Martin' },
  { id: 'ch_demo_03', amount: 22000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 28,       description: 'Abonnement mensuel · Lefèvre Conseil',     customer_email: 'sophie@lefevreconseil.fr',         customer_name: 'Sophie Lefèvre' },
  { id: 'ch_demo_04', amount: 15000, currency: 'eur', status: 'pending',   created: Math.floor(Date.now() / 1000) - 60 * 60 * 50,       description: 'Abonnement mensuel · Dubois Logistique',   customer_email: 'contact@duboislog.fr',             customer_name: 'Marc Dubois' },
  { id: 'ch_demo_05', amount: 18000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 4,   description: 'Abonnement mensuel · Garnier Immobilier',  customer_email: 'j.garnier@garnier-immo.fr',        customer_name: 'Julie Garnier' },
  { id: 'ch_demo_06', amount: 350000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 6,  description: 'Installation initiale · Garnier Immobilier', customer_email: 'j.garnier@garnier-immo.fr',      customer_name: 'Julie Garnier' },
  { id: 'ch_demo_07', amount: 12000, currency: 'eur', status: 'failed',    created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 8,   description: 'Abonnement mensuel · Roche & Fils',        customer_email: 'paul@rocheetfils.fr',              customer_name: 'Paul Roche' },
  { id: 'ch_demo_08', amount: 12000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 9,   description: 'Abonnement mensuel · Roche & Fils',        customer_email: 'paul@rocheetfils.fr',              customer_name: 'Paul Roche' },
  { id: 'ch_demo_09', amount: 25000, currency: 'eur', status: 'succeeded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 12,  description: 'Abonnement mensuel · Atelier Bertin',      customer_email: 'h.bertin@atelier-bertin.fr',       customer_name: 'Hugo Bertin' },
  { id: 'ch_demo_10', amount: 280000, currency: 'eur', status: 'refunded', created: Math.floor(Date.now() / 1000) - 60 * 60 * 24 * 18,  description: 'Installation · Atelier Bertin (annulée)',  customer_email: 'h.bertin@atelier-bertin.fr',       customer_name: 'Hugo Bertin' },
]

function normalize(charge) {
  return {
    id: charge.id,
    amount: charge.amount,
    currency: charge.currency,
    status: charge.status,
    created: charge.created,
    description: charge.description || '—',
    customer_email: charge.billing_details?.email || charge.receipt_email || charge.customer_email || null,
    customer_name: charge.billing_details?.name || charge.customer_name || null,
    receipt_url: charge.receipt_url || null,
  }
}

export async function GET() {
  const key = process.env.STRIPE_SECRET_KEY

  if (!key) {
    return Response.json({
      mode: 'demo',
      message: 'Mode démo — définissez STRIPE_SECRET_KEY pour voir vos vrais paiements',
      payments: MOCK_PAYMENTS,
    })
  }

  try {
    const res = await fetch('https://api.stripe.com/v1/charges?limit=50', {
      headers: { Authorization: `Bearer ${key}` },
      cache: 'no-store',
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return Response.json(
        { error: err?.error?.message || `Erreur Stripe (${res.status})` },
        { status: res.status }
      )
    }

    const data = await res.json()
    return Response.json({
      mode: 'live',
      payments: (data.data || []).map(normalize),
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}
