import crypto from 'crypto'
import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { getCompetitors, saveCompetitor } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

function extractText(html) {
  // Strip scripts, styles, HTML tags
  let txt = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
  txt = txt.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
  txt = txt.replace(/<[^>]+>/g, ' ')
  txt = txt.replace(/\s+/g, ' ').trim()
  return txt.slice(0, 5000)
}

function extractTitle(html) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
  return m ? m[1].trim().slice(0, 200) : null
}

function extractMetaDescription(html) {
  const m = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']+)["']/i)
  return m ? m[1].trim().slice(0, 300) : null
}

export async function POST(_request, { params }) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const list = await getCompetitors()
  const competitor = list.find(c => c.id === params.id)
  if (!competitor) return Response.json({ error: 'Not found' }, { status: 404 })
  if (!competitor.url) return Response.json({ error: 'URL manquante' }, { status: 400 })

  const startedAt = new Date().toISOString()
  let response = null
  try {
    response = await fetch(competitor.url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; NerixiBot/1.0)' },
      signal: AbortSignal.timeout(15000),
      redirect: 'follow',
    })
  } catch (e) {
    const updated = await saveCompetitor({
      ...competitor,
      lastChecked: startedAt,
      lastError: e.message || 'Erreur réseau',
    })
    return Response.json({ competitor: updated, error: e.message || 'Erreur réseau' }, { status: 502 })
  }

  if (!response.ok) {
    const updated = await saveCompetitor({
      ...competitor,
      lastChecked: startedAt,
      lastError: `HTTP ${response.status}`,
    })
    return Response.json({ competitor: updated, error: `HTTP ${response.status}` }, { status: 502 })
  }

  const html = await response.text()
  const snapshot = {
    title: extractTitle(html),
    description: extractMetaDescription(html),
    text: extractText(html),
    contentHash: crypto.createHash('sha256').update(html).digest('hex').slice(0, 16),
    fetchedAt: startedAt,
  }

  // Détection changement
  let lastChange = competitor.lastChange
  let changes = []
  if (competitor.lastSnapshot) {
    const prev = competitor.lastSnapshot
    if (prev.title !== snapshot.title) changes.push(`Titre changé : "${prev.title}" → "${snapshot.title}"`)
    if (prev.description !== snapshot.description) changes.push(`Description changée`)
    if (prev.contentHash !== snapshot.contentHash) {
      // Diff sommaire : nb mots
      const prevWords = new Set((prev.text || '').toLowerCase().split(/\s+/).filter(w => w.length > 4))
      const newWords = new Set((snapshot.text || '').toLowerCase().split(/\s+/).filter(w => w.length > 4))
      const added = [...newWords].filter(w => !prevWords.has(w)).slice(0, 10)
      const removed = [...prevWords].filter(w => !newWords.has(w)).slice(0, 10)
      if (added.length > 0) changes.push(`Nouveaux mots : ${added.slice(0, 5).join(', ')}`)
      if (removed.length > 0) changes.push(`Mots disparus : ${removed.slice(0, 5).join(', ')}`)
    }
    if (changes.length > 0) {
      lastChange = { detectedAt: startedAt, changes }
    }
  }

  const updated = await saveCompetitor({
    ...competitor,
    lastChecked: startedAt,
    lastSnapshot: snapshot,
    lastChange,
    lastError: null,
  })

  return Response.json({ competitor: updated, snapshot, changes, hasChanges: changes.length > 0 })
}
