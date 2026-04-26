import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getWorkflows, saveWorkflow } from '@/lib/workflows'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ workflows: getWorkflows() })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await request.json()
    const wf = saveWorkflow(payload)
    return Response.json({ workflow: wf })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
