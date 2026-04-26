import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getConfig, setConfig } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ config: getConfig() })
}

export async function PUT(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = await request.json()
    return Response.json({ config: setConfig(patch) })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
