import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { logActivity } from '@/lib/store'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const DATA_DIR = path.join(process.cwd(), 'data', 'attachments')

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function clientDir(clientId) {
  const dir = path.join(DATA_DIR, String(clientId))
  fs.mkdirSync(dir, { recursive: true })
  return dir
}

function safe(name) {
  return (name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80)
}

export async function GET(_req, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const dir = clientDir(params.clientId)
  let files = []
  try {
    files = fs.readdirSync(dir).map(name => {
      const full = path.join(dir, name)
      const stat = fs.statSync(full)
      return {
        id: name,
        name: name.replace(/^\d+_/, ''),
        size: stat.size,
        uploadedAt: stat.mtime.toISOString(),
        url: `/api/attachments/${params.clientId}/file/${encodeURIComponent(name)}`,
      }
    }).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))
  } catch {}
  return Response.json({ attachments: files })
}

export async function POST(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    if (!file || typeof file === 'string') return Response.json({ error: 'Fichier manquant' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())
    const dir = clientDir(params.clientId)
    const stamp = Date.now()
    const filename = `${stamp}_${safe(file.name)}`
    const full = path.join(dir, filename)
    fs.writeFileSync(full, buffer)

    logActivity({
      clientId: Number(params.clientId),
      type: 'attachment_uploaded',
      payload: { filename: file.name, size: buffer.length },
    })

    return Response.json({
      attachment: {
        id: filename,
        name: file.name,
        size: buffer.length,
        uploadedAt: new Date().toISOString(),
        url: `/api/attachments/${params.clientId}/file/${encodeURIComponent(filename)}`,
      },
    })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return Response.json({ error: 'id manquant' }, { status: 400 })
  const dir = clientDir(params.clientId)
  const full = path.join(dir, id)
  // ensure resolved path is inside dir
  if (!full.startsWith(dir)) return Response.json({ error: 'Forbidden' }, { status: 403 })
  try { fs.unlinkSync(full) } catch {}
  return Response.json({ success: true })
}
