import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getQuotes, saveQuote } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const url = new URL(request.url)
  const clientId = url.searchParams.get('clientId')
  const prospectId = url.searchParams.get('prospectId')
  const list = await getQuotes({ clientId, prospectId })
  return Response.json({ quotes: list })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const body = await request.json().catch(() => ({}))
  const quote = await saveQuote(body)
  return Response.json({ quote })
}
