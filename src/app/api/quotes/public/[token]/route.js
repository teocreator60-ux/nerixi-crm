import { getQuoteByToken, saveQuote } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(_request, { params }) {
  const quote = await getQuoteByToken(params.token)
  if (!quote) return Response.json({ error: 'Devis introuvable' }, { status: 404 })

  // Mark as viewed (first time)
  if (!quote.viewedAt) {
    await saveQuote({ ...quote, viewedAt: new Date().toISOString(), status: quote.status === 'sent' ? 'viewed' : quote.status })
  }
  return Response.json({ quote })
}
