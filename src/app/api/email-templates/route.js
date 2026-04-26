import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getEmailTemplates, saveEmailTemplate } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET() {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  return Response.json({ templates: getEmailTemplates() })
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const payload = await request.json()
    const tpl = saveEmailTemplate(payload)
    return Response.json({ template: tpl })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}
