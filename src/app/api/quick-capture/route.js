import { cookies } from 'next/headers'
import { verifyToken, AUTH_COOKIE } from '@/lib/auth'
import { createTask, saveProspect, findClientByEmail, createEvent, logActivity } from '@/lib/store'

function requireAuth() {
  const token = cookies().get(AUTH_COOKIE)?.value
  return !!verifyToken(token)
}

// Catégorisation simple basée sur des regex / mots-clés (zéro coût, instantanée)
function categorize(text) {
  const t = (text || '').toLowerCase().trim()
  // Email détecté → prospect
  const emailMatch = t.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i)
  // Date / heure → événement / RDV
  const hasDateTime = /\b(demain|aujourd'hui|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|\d{1,2}h\d{0,2}|\d{1,2}\/\d{1,2})\b/i.test(t)
  const hasMeetingKw = /\b(rdv|rendez-?vous|réunion|appel|call|démo|demo|meeting)\b/i.test(t)
  // Tâche → impératif / verbe d'action
  const hasTaskKw = /\b(rappeler?|appeler?|envoyer?|relancer?|contacter?|faire|finir|préparer?|écrire?|creer?|créer?|todo|à faire)\b/i.test(t)
  // Prospect explicite
  const hasProspectKw = /\b(prospect|nouveau client|signer?|opportunité|lead)\b/i.test(t)

  if (hasMeetingKw && hasDateTime) return { kind: 'event', confidence: 0.9 }
  if (emailMatch || hasProspectKw) return { kind: 'prospect', confidence: 0.7 }
  if (hasTaskKw) return { kind: 'task', confidence: 0.7 }
  // Par défaut : tâche libre
  return { kind: 'task', confidence: 0.4 }
}

function extractDateFromText(text) {
  const t = text.toLowerCase()
  const today = new Date()
  if (/\baujourd'?hui\b/.test(t)) return today.toISOString().slice(0, 10)
  if (/\bdemain\b/.test(t)) return new Date(today.getTime() + 86400000).toISOString().slice(0, 10)
  if (/\bapr[èe]s[- ]demain\b/.test(t)) return new Date(today.getTime() + 2 * 86400000).toISOString().slice(0, 10)
  const days = { 'lundi': 1, 'mardi': 2, 'mercredi': 3, 'jeudi': 4, 'vendredi': 5, 'samedi': 6, 'dimanche': 0 }
  for (const [name, dow] of Object.entries(days)) {
    if (new RegExp('\\b' + name + '\\b', 'i').test(t)) {
      const d = new Date(today)
      const target = (dow + 7 - today.getDay()) % 7 || 7
      d.setDate(today.getDate() + target)
      return d.toISOString().slice(0, 10)
    }
  }
  // Format jj/mm
  const m = t.match(/\b(\d{1,2})\/(\d{1,2})\b/)
  if (m) {
    const [, day, month] = m
    const year = today.getMonth() + 1 > Number(month) ? today.getFullYear() + 1 : today.getFullYear()
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  }
  return null
}

function extractTime(text) {
  const m = text.match(/\b(\d{1,2})\s?h\s?(\d{0,2})\b/i)
  if (m) {
    const h = String(m[1]).padStart(2, '0')
    const min = String(m[2] || '00').padStart(2, '0')
    return `${h}:${min}`
  }
  return null
}

export async function POST(request) {
  if (!requireAuth()) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  const { text, forceKind } = await request.json().catch(() => ({}))
  const raw = (text || '').trim()
  if (!raw) return Response.json({ error: 'Texte vide' }, { status: 400 })

  const cat = forceKind ? { kind: forceKind, confidence: 1 } : categorize(raw)
  const result = { kind: cat.kind, confidence: cat.confidence, raw }

  try {
    if (cat.kind === 'event') {
      const date = extractDateFromText(raw) || new Date().toISOString().slice(0, 10)
      const time = extractTime(raw) || '10:00'
      const ev = await createEvent({
        title: raw.slice(0, 90),
        date, time,
        type: 'meeting',
        notes: raw,
        clientId: null,
      })
      result.event = ev
      result.message = `📅 RDV créé : ${date} ${time}`
    } else if (cat.kind === 'prospect') {
      const emailMatch = raw.match(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i)
      const email = emailMatch ? emailMatch[0] : ''
      // Extraction du nom : tout ce qui est avant l'email ou le verbe
      let entreprise = raw.replace(/\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i, '').trim()
      entreprise = entreprise.replace(/^(prospect|nouveau client|ajoute(?:r)?|cr[ée]er?)\s+/i, '').trim()
      entreprise = entreprise.split(/[,\.\n]/)[0].trim().slice(0, 80) || 'Sans nom'
      const existing = email ? await findClientByEmail(email) : null
      if (existing) {
        result.message = `Le client ${existing.entreprise} existe déjà`
        result.client = existing
        result.kind = 'existing_client'
      } else {
        const p = await saveProspect({
          nom: entreprise, entreprise,
          email,
          stage: 'froid',
          source: 'quick_capture',
          notes: raw,
        })
        result.prospect = p
        result.message = `📥 Prospect créé : ${entreprise}`
      }
    } else {
      // task
      const date = extractDateFromText(raw)
      const t = await createTask({
        title: raw.slice(0, 120),
        date: date || new Date().toISOString().slice(0, 10),
        priority: 'normal',
        completed: false,
      })
      result.task = t
      result.message = `✅ Tâche créée${date ? ` pour le ${date}` : ''}`
    }
    try { await logActivity({ clientId: null, type: 'quick_capture', payload: { text: raw, kind: result.kind } }) } catch {}
    return Response.json(result)
  } catch (e) {
    return Response.json({ error: e.message || 'Erreur' }, { status: 500 })
  }
}
