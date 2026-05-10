import { kv } from '@vercel/kv'

// Rate limiter simple basé sur Vercel KV (sliding window)
// limit: nb max de requêtes / windowSec : fenêtre en secondes
// key: identifiant (ex: IP, userId, endpoint+IP)

const PREFIX = 'rl:'

export async function rateLimit(key, { limit = 100, windowSec = 60 } = {}) {
  if (!key) return { allowed: true, remaining: limit }
  const now = Math.floor(Date.now() / 1000)
  const bucketKey = `${PREFIX}${key}:${Math.floor(now / windowSec)}`
  try {
    const count = await kv.incr(bucketKey)
    if (count === 1) {
      // Première requête dans cette fenêtre → expiration
      await kv.expire(bucketKey, windowSec * 2)
    }
    const remaining = Math.max(0, limit - count)
    const allowed = count <= limit
    return { allowed, remaining, limit, count, resetIn: windowSec - (now % windowSec) }
  } catch {
    // En cas d'erreur Redis, on laisse passer (fail-open) pour pas bloquer le CRM
    return { allowed: true, remaining: limit, error: 'rate-limit-bypass' }
  }
}

export function getClientKey(request) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
             request.headers.get('x-real-ip') ||
             'unknown'
  return ip
}

// Helper pour wrapper une route API
export async function withRateLimit(request, handler, options = {}) {
  const key = options.keyFn ? options.keyFn(request) : getClientKey(request)
  const result = await rateLimit(`${options.prefix || 'api'}:${key}`, options)
  if (!result.allowed) {
    return Response.json(
      { error: 'Trop de requêtes. Réessaie dans un instant.', retryIn: result.resetIn },
      { status: 429, headers: { 'Retry-After': String(result.resetIn) } }
    )
  }
  return handler()
}
