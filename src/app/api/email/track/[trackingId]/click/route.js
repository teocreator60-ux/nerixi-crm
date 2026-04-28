import { trackEmailClick } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request, { params }) {
  const url = new URL(request.url)
  const target = url.searchParams.get('url')
  if (!target) return new Response('Missing url', { status: 400 })
  let dest
  try { dest = new URL(target).toString() } catch { return new Response('Invalid url', { status: 400 }) }
  try { await trackEmailClick(params.trackingId, dest) } catch {}
  return Response.redirect(dest, 302)
}
