import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { subscribe } from '@/lib/eventBus'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const token = cookies().get(AUTH_COOKIE)?.value
  if (!verifyToken(token)) {
    return new Response('Unauthorized', { status: 401 })
  }

  let unsub = null
  let heartbeat = null

  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder()
      const send = (data) => {
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch {}
      }
      send({ type: 'connected', ts: new Date().toISOString() })
      unsub = subscribe(send)
      heartbeat = setInterval(() => {
        try { controller.enqueue(encoder.encode(': hb\n\n')) } catch {}
      }, 25000)
    },
    cancel() {
      if (unsub) unsub()
      if (heartbeat) clearInterval(heartbeat)
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
