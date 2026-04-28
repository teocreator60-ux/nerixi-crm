import { getQuoteByToken, saveQuote, logActivity } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(request, { params }) {
  const body = await request.json().catch(() => ({}))
  const quote = await getQuoteByToken(params.token)
  if (!quote) return Response.json({ error: 'Devis introuvable' }, { status: 404 })
  if (quote.signedAt) return Response.json({ error: 'Déjà signé' }, { status: 400 })

  const signedBy = (body.signedBy || '').trim()
  const signature = body.signature || null
  if (!signedBy) return Response.json({ error: 'Nom du signataire requis' }, { status: 400 })

  const next = await saveQuote({
    ...quote,
    status: 'signed',
    signedAt: new Date().toISOString(),
    signedBy, signature,
  })

  if (quote.clientId) {
    try { await logActivity({ clientId: quote.clientId, type: 'quote_signed', payload: { quoteId: quote.id, signedBy } }) } catch {}
  }

  return Response.json({ quote: next })
}
