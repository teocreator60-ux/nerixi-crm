import fs from 'fs'
import path from 'path'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MIMES = {
  pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  txt: 'text/plain', csv: 'text/csv', json: 'application/json',
  doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

export async function GET(_req, { params }) {
  const token = cookies().get('nerixi_session_v2')?.value
  if (!verifyToken(token)) return new Response('Unauthorized', { status: 401 })

  const dir = path.join(process.cwd(), 'data', 'attachments', String(params.clientId))
  const safe = decodeURIComponent(params.name).replace(/\.\.\//g, '')
  const full = path.join(dir, safe)
  if (!full.startsWith(dir)) return new Response('Forbidden', { status: 403 })

  try {
    const data = fs.readFileSync(full)
    const ext = full.split('.').pop().toLowerCase()
    const ct = MIMES[ext] || 'application/octet-stream'
    return new Response(data, {
      headers: {
        'Content-Type': ct,
        'Content-Disposition': `inline; filename="${safe.replace(/^\d+_/, '')}"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
