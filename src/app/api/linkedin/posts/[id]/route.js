import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { saveLinkedinPost, deleteLinkedinPost } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

export async function PUT(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const patch = await request.json()
    const post = saveLinkedinPost({ ...patch, id: params.id })
    return Response.json({ post })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 400 })
  }
}

export async function DELETE(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  deleteLinkedinPost(params.id)
  return Response.json({ success: true })
}
