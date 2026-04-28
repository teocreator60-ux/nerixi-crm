import { kv } from '@vercel/kv'
import { clients as seedClients } from './clients'

// ─── Storage backend: Vercel KV (Redis) ───────────────────────────
// One key per collection. All functions are async.

const P = 'nerixi:'

// ───────── Seeding (1ère exécution uniquement) ─────────
let seedPromise = null
async function ensureSeeded() {
  if (seedPromise) return seedPromise
  seedPromise = (async () => {
    const flag = await kv.get(P + 'seeded_v1')
    if (flag) return
    const clients = JSON.parse(JSON.stringify(seedClients))
    const payments = clients.flatMap(genPaymentHistory)
    const events = defaultEvents(clients)
    const activities = clients.map(c => ({
      id: `act_seed_${c.id}`,
      ts: new Date(c.dateDebut + 'T09:00:00').toISOString(),
      clientId: c.id,
      type: 'client_created',
      payload: { entreprise: c.entreprise },
    }))
    const nextClientId = Math.max(...clients.map(c => c.id)) + 1

    await Promise.all([
      kv.set(P + 'clients', clients),
      kv.set(P + 'payments', payments),
      kv.set(P + 'events', events),
      kv.set(P + 'activities', activities),
      kv.set(P + 'nextClientId', nextClientId),
      kv.set(P + 'seeded_v1', Date.now()),
    ])
  })()
  return seedPromise
}

function genPaymentHistory(client) {
  const out = []
  const start = new Date(client.dateDebut)
  const now = new Date()
  const months = (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth())
  for (let i = 0; i <= months; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, Math.min(start.getDate(), 28))
    if (d > now) break
    const isThisMonth = d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
    out.push({
      id: `pay_${client.id}_${d.getFullYear()}_${d.getMonth() + 1}`,
      clientId: client.id,
      amount: client.mrr,
      date: d.toISOString().slice(0, 10),
      status: isThisMonth ? (Math.random() > 0.3 ? 'paid' : 'pending') : 'paid',
    })
  }
  return out
}

function defaultEvents(clients) {
  const today = new Date()
  const fmt = (d) => d.toISOString().slice(0, 10)
  const ev = []
  if (clients[0]) ev.push({ id: 'evt_seed_1', clientId: clients[0].id, date: fmt(today), time: '14:30', title: `Point hebdo ${clients[0].entreprise}`, type: 'meeting', done: false, notes: '' })
  if (clients[1]) ev.push({ id: 'evt_seed_2', clientId: clients[1].id, date: fmt(new Date(today.getTime() + 86400000)), time: '10:00', title: `Livraison auto ${clients[1].entreprise}`, type: 'delivery', done: false, notes: '' })
  if (clients[2]) ev.push({ id: 'evt_seed_3', clientId: clients[2].id, date: fmt(new Date(today.getTime() + 3 * 86400000)), time: '16:00', title: `Démo ${clients[2].entreprise}`, type: 'demo', done: false, notes: '' })
  ev.push({ id: 'evt_seed_4', clientId: null, date: fmt(new Date(today.getTime() + 7 * 86400000)), time: '09:00', title: 'Bilan mensuel Nerixi', type: 'reminder', done: false, notes: '' })
  return ev
}

// ───────── KV helpers ─────────
async function readCol(name) { await ensureSeeded(); return (await kv.get(P + name)) || [] }
async function writeCol(name, data) { await kv.set(P + name, data) }
async function readScalar(name) { await ensureSeeded(); return await kv.get(P + name) }
async function writeScalar(name, val) { await kv.set(P + name, val) }

// ───────── Big getStore (utility) ─────────
export async function getStore() {
  await ensureSeeded()
  const [clients, prospects, events, tasks, payments, activities, linkedinPosts, emailTemplates, lists, paymentLinks, inboundEmails, outboundEmails, pageviews, nextClientId, config, workflows] = await Promise.all([
    kv.get(P + 'clients'),
    kv.get(P + 'prospects'),
    kv.get(P + 'events'),
    kv.get(P + 'tasks'),
    kv.get(P + 'payments'),
    kv.get(P + 'activities'),
    kv.get(P + 'linkedinPosts'),
    kv.get(P + 'emailTemplates'),
    kv.get(P + 'lists'),
    kv.get(P + 'paymentLinks'),
    kv.get(P + 'inboundEmails'),
    kv.get(P + 'outboundEmails'),
    kv.get(P + 'pageviews'),
    kv.get(P + 'nextClientId'),
    kv.get(P + 'config'),
    kv.get(P + 'workflows'),
  ])
  return {
    clients: clients || [], prospects: prospects || [], events: events || [],
    tasks: tasks || [], payments: payments || [], activities: activities || [],
    linkedinPosts: linkedinPosts || [], emailTemplates: emailTemplates || [],
    lists: lists || [], paymentLinks: paymentLinks || [],
    inboundEmails: inboundEmails || [], outboundEmails: outboundEmails || [],
    pageviews: pageviews || [], nextClientId: nextClientId || 1,
    config: config || {}, workflows: workflows || [],
  }
}

// ───────── Clients ─────────
export async function getClients() { return await readCol('clients') }
export async function getClient(id) {
  const list = await readCol('clients')
  return list.find(c => c.id === Number(id))
}
export async function createClient(payload) {
  const [list, nextId] = await Promise.all([readCol('clients'), readScalar('nextClientId')])
  const id = nextId || (Math.max(0, ...list.map(c => c.id)) + 1)
  const client = {
    id,
    nom: payload.nom || '',
    entreprise: payload.entreprise || '',
    secteur: payload.secteur || '',
    email: payload.email || '',
    telephone: payload.telephone || '',
    statut: payload.statut || 'prospect',
    mrr: Number(payload.mrr) || 0,
    installation: Number(payload.installation) || 0,
    dateDebut: payload.dateDebut || new Date().toISOString().slice(0, 10),
    avancement: Number(payload.avancement) || 0,
    notes: payload.notes || '',
    automatisations: Array.isArray(payload.automatisations) ? payload.automatisations : [],
    prochainAction: payload.prochainAction || '',
    linkedin: payload.linkedin || '',
    tags: Array.isArray(payload.tags) ? payload.tags : [],
  }
  list.push(client)
  await writeCol('clients', list)
  await writeScalar('nextClientId', id + 1)
  await pushActivity({
    ts: new Date().toISOString(),
    clientId: id,
    type: 'client_created',
    payload: { entreprise: client.entreprise, statut: client.statut },
  })
  return client
}
export async function updateClient(id, patch) {
  const list = await readCol('clients')
  const idx = list.findIndex(c => c.id === Number(id))
  if (idx === -1) return null
  const cur = list[idx]
  const next = {
    ...cur, ...patch, id: cur.id,
    mrr: patch.mrr !== undefined ? Number(patch.mrr) : cur.mrr,
    installation: patch.installation !== undefined ? Number(patch.installation) : cur.installation,
    avancement: patch.avancement !== undefined ? Number(patch.avancement) : cur.avancement,
    automatisations: Array.isArray(patch.automatisations) ? patch.automatisations : cur.automatisations,
    tags: Array.isArray(patch.tags) ? patch.tags : cur.tags,
  }
  list[idx] = next
  await writeCol('clients', list)
  if (patch.statut && patch.statut !== cur.statut) {
    await pushActivity({
      ts: new Date().toISOString(), clientId: cur.id,
      type: 'status_changed',
      payload: { from: cur.statut, to: patch.statut },
    })
  }
  return { client: next, statusChanged: patch.statut && patch.statut !== cur.statut, previousStatus: cur.statut }
}
export async function deleteClient(id) {
  const [clients, events, payments] = await Promise.all([readCol('clients'), readCol('events'), readCol('payments')])
  const before = clients.length
  await Promise.all([
    writeCol('clients', clients.filter(c => c.id !== Number(id))),
    writeCol('events', events.filter(e => e.clientId !== Number(id))),
    writeCol('payments', payments.filter(p => p.clientId !== Number(id))),
  ])
  return before !== clients.length - 0
}

// ───────── Events ─────────
export async function getEvents() { return await readCol('events') }
export async function createEvent(payload) {
  const list = await readCol('events')
  const event = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    clientId: payload.clientId ? Number(payload.clientId) : null,
    date: payload.date,
    time: payload.time || '09:00',
    title: payload.title || '',
    type: payload.type || 'reminder',
    done: !!payload.done,
    notes: payload.notes || '',
  }
  list.push(event)
  await writeCol('events', list)
  return event
}
export async function updateEvent(id, patch) {
  const list = await readCol('events')
  const idx = list.findIndex(e => e.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...patch, id }
  await writeCol('events', list)
  return list[idx]
}
export async function deleteEvent(id) {
  const list = await readCol('events')
  await writeCol('events', list.filter(e => e.id !== id))
  return true
}

// ───────── Payments ─────────
export async function getPayments() { return await readCol('payments') }
export async function setPaymentStatus(paymentId, status) {
  const list = await readCol('payments')
  const idx = list.findIndex(p => p.id === paymentId)
  if (idx === -1) return null
  list[idx].status = status
  await writeCol('payments', list)
  return list[idx]
}

// ───────── Tasks ─────────
export async function getTasks(clientId) {
  const list = await readCol('tasks')
  if (clientId != null) return list.filter(t => t.clientId === Number(clientId))
  return list
}
export async function createTask(payload) {
  const list = await readCol('tasks')
  const task = {
    id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    clientId: payload.clientId != null ? Number(payload.clientId) : null,
    title: payload.title || '',
    priority: ['high', 'med', 'low'].includes(payload.priority) ? payload.priority : 'med',
    done: !!payload.done,
    dueDate: payload.dueDate || null,
    notes: payload.notes || '',
    createdAt: new Date().toISOString(),
  }
  list.push(task)
  await writeCol('tasks', list)
  return task
}
export async function updateTask(id, patch) {
  const list = await readCol('tasks')
  const idx = list.findIndex(t => t.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], ...patch, id }
  await writeCol('tasks', list)
  return list[idx]
}
export async function deleteTask(id) {
  const list = await readCol('tasks')
  await writeCol('tasks', list.filter(t => t.id !== id))
  return true
}

// ───────── Config ─────────
export async function getConfig() { return (await readScalar('config')) || {} }
export async function setConfig(patch) {
  const cur = (await readScalar('config')) || {}
  const next = { ...cur, ...patch }
  await writeScalar('config', next)
  return next
}

// ───────── Activities ─────────
async function pushActivity(entry) {
  const list = await readCol('activities')
  const activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: entry.ts || new Date().toISOString(),
    clientId: entry.clientId != null ? Number(entry.clientId) : null,
    type: entry.type,
    payload: entry.payload || {},
  }
  list.push(activity)
  // Trim to last 5000
  const trimmed = list.length > 5000 ? list.slice(-5000) : list
  await writeCol('activities', trimmed)
  return activity
}
export async function logActivity(entry) { return await pushActivity(entry) }
export async function getActivities(clientId) {
  const list = await readCol('activities')
  if (clientId != null) return list.filter(a => a.clientId === Number(clientId))
  return list
}

// ───────── Prospects ─────────
export const PROSPECT_STAGES = [
  { id: 'froid',          label: 'Froid',          color: '#7a9bb0', icon: '🧊' },
  { id: 'contacte',       label: 'Contacté',       color: '#6cb6f5', icon: '✉️' },
  { id: 'rdv_programme',  label: 'RDV programmé',  color: '#36e6c4', icon: '📅' },
  { id: 'rdv_fait',       label: 'RDV fait',       color: '#fac775', icon: '🤝' },
  { id: 'proposition',    label: 'Proposition',    color: '#ffaf6b', icon: '📄' },
  { id: 'en_attente',     label: 'En attente',     color: '#b89cff', icon: '⏳' },
  { id: 'signe',          label: 'Signé',          color: '#00e89a', icon: '✅' },
  { id: 'refuse',         label: 'Refusé',         color: '#ff8a89', icon: '❌' },
]

export async function getProspects() { return await readCol('prospects') }
export async function getProspect(id) {
  const list = await readCol('prospects')
  return list.find(p => p.id === id)
}
export async function saveProspect(input) {
  const list = await readCol('prospects')
  const isNew = !input.id
  const id = input.id || `prosp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()
  const prev = isNew ? null : list.find(p => p.id === id)
  const prospect = {
    id,
    nom:           input.nom || '',
    entreprise:    input.entreprise || '',
    email:         input.email || '',
    telephone:     input.telephone || '',
    linkedin:      input.linkedin || '',
    secteur:       input.secteur || '',
    role:          input.role || '',
    source:        input.source || 'cold',
    stage:         input.stage || 'froid',
    estimatedMRR:  Number(input.estimatedMRR) || 0,
    lastContact:   input.lastContact || (prev ? prev.lastContact : null),
    nextAction:    input.nextAction || '',
    notes:         input.notes || '',
    createdAt:     input.createdAt || (prev ? prev.createdAt : now),
    updatedAt:     now,
  }
  if (isNew) list.push(prospect)
  else {
    const idx = list.findIndex(p => p.id === id)
    if (idx === -1) list.push(prospect)
    else list[idx] = prospect
  }
  await writeCol('prospects', list)
  if (prev && prev.stage !== prospect.stage) {
    await pushActivity({
      ts: now, clientId: null,
      type: 'prospect_stage_changed',
      payload: { prospectId: id, entreprise: prospect.entreprise, from: prev.stage, to: prospect.stage },
    })
  }
  return { prospect, stageChanged: prev && prev.stage !== prospect.stage, previousStage: prev?.stage }
}
export async function deleteProspect(id) {
  const list = await readCol('prospects')
  await writeCol('prospects', list.filter(p => p.id !== id))
  return true
}

// ───────── LinkedIn posts ─────────
export async function getLinkedinPosts() { return await readCol('linkedinPosts') }
export async function saveLinkedinPost(input) {
  const list = await readCol('linkedinPosts')
  const isNew = !input.id
  const id = input.id || `lipost_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const post = {
    id,
    type: input.type || 'tofu',
    sujet: input.sujet || '',
    contenu: input.contenu || '',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (isNew) list.unshift(post)
  else {
    const idx = list.findIndex(p => p.id === id)
    if (idx === -1) list.unshift(post); else list[idx] = post
  }
  const trimmed = list.length > 100 ? list.slice(0, 100) : list
  await writeCol('linkedinPosts', trimmed)
  return post
}
export async function deleteLinkedinPost(id) {
  const list = await readCol('linkedinPosts')
  await writeCol('linkedinPosts', list.filter(p => p.id !== id))
  return true
}

// ───────── Lists ─────────
export async function getLists() { return await readCol('lists') }
export async function getList(id) {
  const list = await readCol('lists')
  return list.find(l => l.id === id)
}
export async function saveList(input) {
  const list = await readCol('lists')
  const isNew = !input.id
  const id = input.id || `list_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const ent = {
    id,
    name: input.name || 'Nouvelle liste',
    clientIds: Array.isArray(input.clientIds) ? input.clientIds.map(Number).filter(n => !isNaN(n)) : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (isNew) list.push(ent)
  else {
    const idx = list.findIndex(l => l.id === id)
    if (idx === -1) list.push(ent); else list[idx] = ent
  }
  await writeCol('lists', list)
  return ent
}
export async function deleteList(id) {
  const list = await readCol('lists')
  await writeCol('lists', list.filter(l => l.id !== id))
  return true
}

// ───────── Email templates ─────────
export async function getEmailTemplates() { return await readCol('emailTemplates') }
export async function getEmailTemplate(id) {
  const list = await readCol('emailTemplates')
  return list.find(t => t.id === id)
}
export async function saveEmailTemplate(input) {
  const list = await readCol('emailTemplates')
  const isNew = !input.id
  const id = input.id || `tpl_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const tpl = {
    id,
    name: input.name || 'Sans titre',
    subject: input.subject || '',
    html: input.html || '',
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (isNew) list.push(tpl)
  else {
    const idx = list.findIndex(t => t.id === id)
    if (idx === -1) list.push(tpl); else list[idx] = tpl
  }
  await writeCol('emailTemplates', list)
  return tpl
}
export async function deleteEmailTemplate(id) {
  const list = await readCol('emailTemplates')
  await writeCol('emailTemplates', list.filter(t => t.id !== id))
  return true
}

// ───────── Payment links ─────────
export async function getPaymentLinks(clientId) {
  const list = await readCol('paymentLinks')
  if (clientId != null) return list.filter(p => p.clientId === Number(clientId))
  return list
}
export async function savePaymentLink(input) {
  const list = await readCol('paymentLinks')
  const isNew = !input.id
  const id = input.id || `plink_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const link = {
    id,
    clientId:    input.clientId != null ? Number(input.clientId) : null,
    stripeId:    input.stripeId || null,
    url:         input.url || '',
    amount:      Number(input.amount) || 0,
    currency:    input.currency || 'eur',
    description: input.description || '',
    status:      input.status || 'created',
    paidAt:      input.paidAt || null,
    expiresAt:   input.expiresAt || null,
    createdAt:   input.createdAt || new Date().toISOString(),
    invoiceNumber: input.invoiceNumber || null,
  }
  if (isNew) list.unshift(link)
  else {
    const idx = list.findIndex(p => p.id === id)
    if (idx === -1) list.unshift(link); else list[idx] = link
  }
  await writeCol('paymentLinks', list)
  return link
}
export async function findPaymentLinkByStripeId(stripeId) {
  const list = await readCol('paymentLinks')
  return list.find(p => p.stripeId === stripeId)
}

// ───────── Pageviews / sessions ─────────
export async function getPageviews(limit = 200) {
  const list = await readCol('pageviews')
  return list.slice(0, limit)
}
export async function getRecentSessions(limit = 50) {
  const list = await readCol('pageviews')
  const map = new Map()
  for (const pv of list) {
    if (!map.has(pv.sid)) {
      map.set(pv.sid, {
        sid: pv.sid,
        firstSeen: pv.ts, lastSeen: pv.ts,
        pageviews: 0, urls: [],
        clientId: pv.clientId || null,
        identifiedEmail: pv.identifiedEmail || null,
        ip: pv.ip, ua: pv.ua, referrer: pv.referrer,
      })
    }
    const s = map.get(pv.sid)
    s.pageviews++
    if (pv.ts < s.firstSeen) s.firstSeen = pv.ts
    if (pv.ts > s.lastSeen) s.lastSeen = pv.ts
    s.urls.push({ url: pv.url, title: pv.title, ts: pv.ts })
    if (pv.clientId && !s.clientId) s.clientId = pv.clientId
    if (pv.identifiedEmail && !s.identifiedEmail) s.identifiedEmail = pv.identifiedEmail
  }
  return [...map.values()]
    .sort((a, b) => new Date(b.lastSeen) - new Date(a.lastSeen))
    .slice(0, limit)
}
export async function savePageview(input) {
  const list = await readCol('pageviews')
  const id = `pv_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const pv = {
    id,
    sid:   input.sid || 'anon_' + id,
    ts:    input.ts || new Date().toISOString(),
    url:   input.url || '',
    title: input.title || '',
    referrer: input.referrer || '',
    ip:    input.ip || null,
    ua:    input.ua || '',
    clientId: input.clientId != null ? Number(input.clientId) : null,
    identifiedEmail: input.identifiedEmail || null,
  }
  list.unshift(pv)
  const trimmed = list.length > 5000 ? list.slice(0, 5000) : list
  await writeCol('pageviews', trimmed)
  return pv
}
export async function identifySession(sid, { clientId, email }) {
  const list = await readCol('pageviews')
  let updated = 0
  for (const pv of list) {
    if (pv.sid === sid) {
      if (clientId != null && !pv.clientId) { pv.clientId = Number(clientId); updated++ }
      if (email && !pv.identifiedEmail) { pv.identifiedEmail = email; updated++ }
    }
  }
  if (updated > 0) await writeCol('pageviews', list)
  return updated
}

// ───────── Inbox / Outbox emails ─────────
export async function getInboundEmails(clientId) {
  const list = await readCol('inboundEmails')
  if (clientId != null) return list.filter(m => m.clientId === Number(clientId))
  return list
}
export async function getOutboundEmails(clientId) {
  const list = await readCol('outboundEmails')
  if (clientId != null) return list.filter(m => m.clientId === Number(clientId))
  return list
}
export async function saveInboundEmail(input) {
  const list = await readCol('inboundEmails')
  const id = `in_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const email = {
    id,
    clientId:  input.clientId != null ? Number(input.clientId) : null,
    fromEmail: input.fromEmail || '',
    fromName:  input.fromName || '',
    toEmail:   input.toEmail || '',
    subject:   input.subject || '(sans objet)',
    text:      input.text || '',
    html:      input.html || '',
    receivedAt: input.receivedAt || new Date().toISOString(),
    read:      !!input.read,
  }
  list.unshift(email)
  const trimmed = list.length > 1000 ? list.slice(0, 1000) : list
  await writeCol('inboundEmails', trimmed)
  return email
}
export async function saveOutboundEmail(input) {
  const list = await readCol('outboundEmails')
  const id = `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const trackingId = input.trackingId || `trk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const email = {
    id,
    trackingId,
    clientId: input.clientId != null ? Number(input.clientId) : null,
    toEmail:  input.toEmail || '',
    toName:   input.toName || '',
    subject:  input.subject || '',
    content:  input.content || '',
    sentAt:   input.sentAt || new Date().toISOString(),
    opens: 0, openedAt: null, lastOpenAt: null,
    clicks: 0, clickedAt: null, lastClickAt: null, clickedUrls: [],
    sequenceId: input.sequenceId || null,
    enrollmentId: input.enrollmentId || null,
    repliedAt: null,
  }
  list.unshift(email)
  const trimmed = list.length > 2000 ? list.slice(0, 2000) : list
  await writeCol('outboundEmails', trimmed)
  return email
}
export async function trackEmailOpen(trackingId) {
  const list = await readCol('outboundEmails')
  const idx = list.findIndex(m => m.trackingId === trackingId)
  if (idx === -1) return null
  const cur = list[idx]
  const now = new Date().toISOString()
  list[idx] = { ...cur, opens: (cur.opens || 0) + 1, openedAt: cur.openedAt || now, lastOpenAt: now }
  await writeCol('outboundEmails', list)
  return list[idx]
}
export async function trackEmailClick(trackingId, url) {
  const list = await readCol('outboundEmails')
  const idx = list.findIndex(m => m.trackingId === trackingId)
  if (idx === -1) return null
  const cur = list[idx]
  const now = new Date().toISOString()
  const clickedUrls = Array.isArray(cur.clickedUrls) ? [...cur.clickedUrls, { url, ts: now }] : [{ url, ts: now }]
  list[idx] = { ...cur, clicks: (cur.clicks || 0) + 1, clickedAt: cur.clickedAt || now, lastClickAt: now, clickedUrls: clickedUrls.slice(-50) }
  await writeCol('outboundEmails', list)
  return list[idx]
}
export async function markOutboundReplied(toEmail) {
  if (!toEmail) return 0
  const list = await readCol('outboundEmails')
  const norm = toEmail.toLowerCase().trim()
  const now = new Date().toISOString()
  let updated = 0
  for (const m of list) {
    if (!m.repliedAt && (m.toEmail || '').toLowerCase().trim() === norm) {
      m.repliedAt = now
      updated++
    }
  }
  if (updated > 0) await writeCol('outboundEmails', list)
  return updated
}
export async function markEmailRead(id, read = true) {
  const list = await readCol('inboundEmails')
  const idx = list.findIndex(m => m.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], read: !!read }
  await writeCol('inboundEmails', list)
  return list[idx]
}
export async function assignEmailToClient(id, clientId) {
  const list = await readCol('inboundEmails')
  const idx = list.findIndex(m => m.id === id)
  if (idx === -1) return null
  list[idx] = { ...list[idx], clientId: clientId != null ? Number(clientId) : null }
  await writeCol('inboundEmails', list)
  return list[idx]
}
export async function deleteInboundEmail(id) {
  const list = await readCol('inboundEmails')
  await writeCol('inboundEmails', list.filter(m => m.id !== id))
  return true
}
export async function findClientByEmail(email) {
  if (!email) return null
  const norm = email.toLowerCase().trim()
  const list = await readCol('clients')
  return list.find(c => (c.email || '').toLowerCase().trim() === norm) || null
}

// ───────── Email sequences ─────────
export async function getSequences() { return await readCol('sequences') }
export async function saveSequence(input) {
  const list = await readCol('sequences')
  const isNew = !input.id
  const id = input.id || `seq_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const seq = {
    id,
    name: input.name || 'Nouvelle séquence',
    description: input.description || '',
    steps: Array.isArray(input.steps) ? input.steps.map((s, i) => ({
      dayOffset: Number(s.dayOffset) || 0,
      subject: s.subject || '',
      content: s.content || '',
      order: i,
    })) : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (isNew) list.unshift(seq)
  else {
    const idx = list.findIndex(s => s.id === id)
    if (idx === -1) list.unshift(seq); else list[idx] = seq
  }
  await writeCol('sequences', list)
  return seq
}
export async function deleteSequence(id) {
  const list = await readCol('sequences')
  await writeCol('sequences', list.filter(s => s.id !== id))
  // Cancel any active enrollments
  const enrolls = await readCol('enrollments')
  await writeCol('enrollments', enrolls.filter(e => e.sequenceId !== id))
  return true
}

export async function getEnrollments({ sequenceId, email, status } = {}) {
  let list = await readCol('enrollments')
  if (sequenceId) list = list.filter(e => e.sequenceId === sequenceId)
  if (email) list = list.filter(e => (e.recipientEmail || '').toLowerCase() === email.toLowerCase())
  if (status) list = list.filter(e => e.status === status)
  return list
}
export async function saveEnrollment(input) {
  const list = await readCol('enrollments')
  const isNew = !input.id
  const id = input.id || `enr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const enr = {
    id,
    sequenceId: input.sequenceId,
    recipientEmail: (input.recipientEmail || '').toLowerCase().trim(),
    recipientName: input.recipientName || '',
    clientId: input.clientId != null ? Number(input.clientId) : null,
    prospectId: input.prospectId != null ? Number(input.prospectId) : null,
    currentStep: Number(input.currentStep) || 0,
    nextSendAt: input.nextSendAt || new Date().toISOString(),
    status: input.status || 'active',
    startedAt: input.startedAt || new Date().toISOString(),
    pausedAt: input.pausedAt || null,
    completedAt: input.completedAt || null,
    history: Array.isArray(input.history) ? input.history : [],
  }
  if (isNew) list.unshift(enr)
  else {
    const idx = list.findIndex(e => e.id === id)
    if (idx === -1) list.unshift(enr); else list[idx] = enr
  }
  await writeCol('enrollments', list)
  return enr
}
export async function pauseEnrollmentsByEmail(email, reason = 'replied') {
  if (!email) return 0
  const norm = email.toLowerCase().trim()
  const list = await readCol('enrollments')
  let count = 0
  for (const e of list) {
    if (e.status === 'active' && (e.recipientEmail || '').toLowerCase() === norm) {
      e.status = 'paused'
      e.pausedAt = new Date().toISOString()
      e.pauseReason = reason
      count++
    }
  }
  if (count > 0) await writeCol('enrollments', list)
  return count
}
export async function deleteEnrollment(id) {
  const list = await readCol('enrollments')
  await writeCol('enrollments', list.filter(e => e.id !== id))
  return true
}

// ───────── Quotes (Devis) ─────────
export async function getQuotes({ clientId, prospectId } = {}) {
  let list = await readCol('quotes')
  if (clientId != null) list = list.filter(q => q.clientId === Number(clientId))
  if (prospectId != null) list = list.filter(q => q.prospectId === Number(prospectId))
  return list
}
export async function getQuote(id) {
  const list = await readCol('quotes')
  return list.find(q => q.id === id)
}
export async function getQuoteByToken(token) {
  if (!token) return null
  const list = await readCol('quotes')
  return list.find(q => q.token === token)
}
export async function saveQuote(input) {
  const list = await readCol('quotes')
  const isNew = !input.id
  const id = input.id || `quote_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const token = input.token || `qtk_${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`
  const items = Array.isArray(input.items) ? input.items.map(it => ({
    label: it.label || '',
    description: it.description || '',
    quantity: Number(it.quantity) || 1,
    unitPrice: Number(it.unitPrice) || 0,
  })) : []
  const subtotal = items.reduce((s, it) => s + (it.quantity * it.unitPrice), 0)
  const tva = input.tvaRate != null ? Number(input.tvaRate) : 20
  const total = Math.round(subtotal * (1 + tva / 100))
  const installation = Number(input.installation) || 0
  const monthly = Number(input.monthly) || 0
  const quote = {
    id, token,
    quoteNumber: input.quoteNumber || `Q-${new Date().getFullYear()}-${String((list.length + 1)).padStart(4, '0')}`,
    clientId: input.clientId != null ? Number(input.clientId) : null,
    prospectId: input.prospectId != null ? Number(input.prospectId) : null,
    recipientName: input.recipientName || '',
    recipientEmail: input.recipientEmail || '',
    company: input.company || '',
    title: input.title || 'Devis Nerixi',
    items, subtotal, tvaRate: tva, total, installation, monthly,
    notes: input.notes || '',
    validUntil: input.validUntil || null,
    status: input.status || 'draft',
    sentAt: input.sentAt || null,
    viewedAt: input.viewedAt || null,
    signedAt: input.signedAt || null,
    paidAt: input.paidAt || null,
    signature: input.signature || null,
    signedBy: input.signedBy || null,
    paymentLinkId: input.paymentLinkId || null,
    paymentLinkUrl: input.paymentLinkUrl || null,
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (isNew) list.unshift(quote)
  else {
    const idx = list.findIndex(q => q.id === id)
    if (idx === -1) list.unshift(quote); else list[idx] = quote
  }
  await writeCol('quotes', list)
  return quote
}
export async function deleteQuote(id) {
  const list = await readCol('quotes')
  await writeCol('quotes', list.filter(q => q.id !== id))
  return true
}
