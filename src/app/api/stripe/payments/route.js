const MOCK_PAYMENTS = []

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
