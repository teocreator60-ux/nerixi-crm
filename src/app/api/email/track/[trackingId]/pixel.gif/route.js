import { trackEmailOpen } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const GIF_1x1 = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')

export async function GET(_request, { params }) {
  try { await trackEmailOpen(params.trackingId) } catch {}
  return new Response(GIF_1x1, {
    status: 200,
    headers: {
      'Content-Type': 'image/gif',
      'Content-Length': String(GIF_1x1.length),
      'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  })
}
