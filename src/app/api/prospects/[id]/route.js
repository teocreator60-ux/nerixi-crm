import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getProspect, saveProspect, deleteProspect } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function GET(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const p = await getProspect(params.id)
  if (!p) return Response.json({ error: 'Not found' }, { status: 404 })
  return Response.json({ prospect: p })
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = await request.json()
    const result = await saveProspect({ ...patch, id: params.id })
    return Response.json({ prospect: result.prospect, stageChanged: result.stageChanged })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteProspect(params.id)
  return Response.json({ success: true })
}
