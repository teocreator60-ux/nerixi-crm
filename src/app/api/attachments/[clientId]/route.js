import { put, list, del } from '@vercel/blob'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { logActivity } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function safe(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

function prefixFor(clientId) {
  return `clients/${clientId}/`
}

export async function GET(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const { blobs } = await list({ prefix: prefixFor(params.clientId), limit: 100 })
    const files = blobs
      .map(b => {
        const fname = b.pathname.split('/').pop()
        return {
          id: b.pathname,
          name: fname.replace(/^\d+_/, ''),
          size: b.size,
          uploadedAt: b.uploadedAt,
          url: b.url,
        }
      })
      .sort((a, b) => (b.uploadedAt || '').localeCompare(a.uploadedAt || ''))
    return Response.json({ attachments: files })
  } catch (e) {
    return Response.json({ attachments: [], error: e.message }, { status: 200 })
  }
}

export async function POST(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') return Response.json({ error: 'Fichier manquant' }, { status: 400 })

    const stamp = Date.now()
    const path = `${prefixFor(params.clientId)}${stamp}_${safe(file.name)}`

    const blob = await put(path, file, { access: 'public', addRandomSuffix: false })

    await logActivity({
      clientId: Number(params.clientId),
      type: 'attachment_uploaded',
      payload: { filename: file.name, size: file.size, url: blob.url },
    })

    return Response.json({
      attachment: {
        id: blob.pathname,
        name: file.name,
        size: file.size,
        uploadedAt: new Date().toISOString(),
        url: blob.url,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id') // pathname
  if (!id) return Response.json({ error: 'id manquant' }, { status: 400 })
  // Security: ensure path starts with the client's prefix
  if (!id.startsWith(prefixFor(params.clientId))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }
  try { await del(id) } catch {}
  return Response.json({ success: true })
}
