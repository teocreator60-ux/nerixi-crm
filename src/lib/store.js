import fs from 'fs'
import path from 'path'
import { clients as seedClients } from './clients'

const DATA_DIR = path.join(process.cwd(), 'data')
const STORE_FILE = path.join(DATA_DIR, 'store.json')

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }) } catch {}
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

function defaultStore() {
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
  return { clients, payments, events, activities, nextClientId: Math.max(...clients.map(c => c.id)) + 1 }
}

function readStore() {
  ensureDir()
  if (!fs.existsSync(STORE_FILE)) {
    const data = defaultStore()
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2))
    return data
  }
  try {
    const raw = fs.readFileSync(STORE_FILE, 'utf8')
    return JSON.parse(raw)
  } catch {
    const data = defaultStore()
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2))
    return data
  }
}

function writeStore(data) {
  ensureDir()
  fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2))
}

export function getStore() {
  return readStore()
}

export function getClients() {
  return readStore().clients
}

export function getClient(id) {
  return readStore().clients.find(c => c.id === Number(id))
}

export function createClient(payload) {
  const store = readStore()
  const id = store.nextClientId || (Math.max(0, ...store.clients.map(c => c.id)) + 1)
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
  store.clients.push(client)
  store.nextClientId = id + 1
  store.activities = store.activities || []
  store.activities.push({
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: new Date().toISOString(),
    clientId: id,
    type: 'client_created',
    payload: { entreprise: client.entreprise, statut: client.statut },
  })
  writeStore(store)
  return client
}

export function updateClient(id, patch) {
  const store = readStore()
  const idx = store.clients.findIndex(c => c.id === Number(id))
  if (idx === -1) return null
  const cur = store.clients[idx]
  const next = {
    ...cur,
    ...patch,
    id: cur.id,
    mrr: patch.mrr !== undefined ? Number(patch.mrr) : cur.mrr,
    installation: patch.installation !== undefined ? Number(patch.installation) : cur.installation,
    avancement: patch.avancement !== undefined ? Number(patch.avancement) : cur.avancement,
    automatisations: Array.isArray(patch.automatisations) ? patch.automatisations : cur.automatisations,
    tags: Array.isArray(patch.tags) ? patch.tags : cur.tags,
  }
  store.clients[idx] = next
  store.activities = store.activities || []
  if (patch.statut && patch.statut !== cur.statut) {
    store.activities.push({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: new Date().toISOString(),
      clientId: cur.id,
      type: 'status_changed',
      payload: { from: cur.statut, to: patch.statut },
    })
  }
  writeStore(store)
  return { client: next, statusChanged: patch.statut && patch.statut !== cur.statut, previousStatus: cur.statut }
}

export function deleteClient(id) {
  const store = readStore()
  const before = store.clients.length
  store.clients = store.clients.filter(c => c.id !== Number(id))
  store.events = (store.events || []).filter(e => e.clientId !== Number(id))
  store.payments = (store.payments || []).filter(p => p.clientId !== Number(id))
  writeStore(store)
  return before !== store.clients.length
}

export function getEvents() {
  return readStore().events || []
}

export function createEvent(payload) {
  const store = readStore()
  const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const event = {
    id,
    clientId: payload.clientId ? Number(payload.clientId) : null,
    date: payload.date,
    time: payload.time || '09:00',
    title: payload.title || '',
    type: payload.type || 'reminder',
    done: !!payload.done,
    notes: payload.notes || '',
  }
  store.events = store.events || []
  store.events.push(event)
  writeStore(store)
  return event
}

export function updateEvent(id, patch) {
  const store = readStore()
  store.events = store.events || []
  const idx = store.events.findIndex(e => e.id === id)
  if (idx === -1) return null
  store.events[idx] = { ...store.events[idx], ...patch, id }
  writeStore(store)
  return store.events[idx]
}

export function deleteEvent(id) {
  const store = readStore()
  store.events = (store.events || []).filter(e => e.id !== id)
  writeStore(store)
  return true
}

export function getPayments() {
  return readStore().payments || []
}

export function getTasks(clientId) {
  const tasks = readStore().tasks || []
  if (clientId != null) return tasks.filter(t => t.clientId === Number(clientId))
  return tasks
}

export function createTask(payload) {
  const store = readStore()
  store.tasks = store.tasks || []
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
  store.tasks.push(task)
  writeStore(store)
  return task
}

export function updateTask(id, patch) {
  const store = readStore()
  store.tasks = store.tasks || []
  const idx = store.tasks.findIndex(t => t.id === id)
  if (idx === -1) return null
  store.tasks[idx] = { ...store.tasks[idx], ...patch, id }
  writeStore(store)
  return store.tasks[idx]
}

export function deleteTask(id) {
  const store = readStore()
  store.tasks = (store.tasks || []).filter(t => t.id !== id)
  writeStore(store)
  return true
}

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

export function getProspects() {
  return readStore().prospects || []
}
export function getProspect(id) {
  return getProspects().find(p => p.id === id)
}
export function saveProspect(input) {
  const store = readStore()
  store.prospects = store.prospects || []
  const isNew = !input.id
  const id = input.id || `prosp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const now = new Date().toISOString()
  const prev = isNew ? null : store.prospects.find(p => p.id === id)
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
  if (isNew) store.prospects.push(prospect)
  else {
    const idx = store.prospects.findIndex(p => p.id === id)
    if (idx === -1) store.prospects.push(prospect)
    else store.prospects[idx] = prospect
  }
  store.activities = store.activities || []
  if (prev && prev.stage !== prospect.stage) {
    store.activities.push({
      id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      ts: now, clientId: null,
      type: 'prospect_stage_changed',
      payload: { prospectId: id, entreprise: prospect.entreprise, from: prev.stage, to: prospect.stage },
    })
  }
  writeStore(store)
  return { prospect, stageChanged: prev && prev.stage !== prospect.stage, previousStage: prev?.stage }
}
export function deleteProspect(id) {
  const store = readStore()
  store.prospects = (store.prospects || []).filter(p => p.id !== id)
  writeStore(store)
  return true
}

// ───────── Visitor tracking ─────────
export function getPageviews(limit = 200) {
  const all = readStore().pageviews || []
  return all.slice(0, limit)
}

export function getRecentSessions(limit = 50) {
  const all = readStore().pageviews || []
  const map = new Map()
  for (const pv of all) {
    if (!map.has(pv.sid)) {
      map.set(pv.sid, {
        sid: pv.sid,
        firstSeen: pv.ts, lastSeen: pv.ts,
        pageviews: 0,
        urls: [],
        clientId: pv.clientId || null,
        identifiedEmail: pv.identifiedEmail || null,
        ip: pv.ip,
        ua: pv.ua,
        referrer: pv.referrer,
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

export function savePageview(input) {
  const store = readStore()
  store.pageviews = store.pageviews || []
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
  store.pageviews.unshift(pv)
  if (store.pageviews.length > 5000) store.pageviews = store.pageviews.slice(0, 5000)
  writeStore(store)
  return pv
}

export function identifySession(sid, { clientId, email }) {
  const store = readStore()
  store.pageviews = store.pageviews || []
  let updated = 0
  for (const pv of store.pageviews) {
    if (pv.sid === sid) {
      if (clientId != null && !pv.clientId) { pv.clientId = Number(clientId); updated++ }
      if (email && !pv.identifiedEmail) { pv.identifiedEmail = email; updated++ }
    }
  }
  writeStore(store)
  return updated
}

export function getInboundEmails(clientId) {
  const all = readStore().inboundEmails || []
  if (clientId != null) return all.filter(m => m.clientId === Number(clientId))
  return all
}

export function getOutboundEmails(clientId) {
  const all = readStore().outboundEmails || []
  if (clientId != null) return all.filter(m => m.clientId === Number(clientId))
  return all
}

export function saveInboundEmail(input) {
  const store = readStore()
  store.inboundEmails = store.inboundEmails || []
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
  store.inboundEmails.unshift(email)
  if (store.inboundEmails.length > 1000) store.inboundEmails = store.inboundEmails.slice(0, 1000)
  writeStore(store)
  return email
}

export function saveOutboundEmail(input) {
  const store = readStore()
  store.outboundEmails = store.outboundEmails || []
  const id = `out_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const email = {
    id,
    clientId: input.clientId != null ? Number(input.clientId) : null,
    toEmail:  input.toEmail || '',
    toName:   input.toName || '',
    subject:  input.subject || '',
    content:  input.content || '',
    sentAt:   input.sentAt || new Date().toISOString(),
  }
  store.outboundEmails.unshift(email)
  if (store.outboundEmails.length > 1000) store.outboundEmails = store.outboundEmails.slice(0, 1000)
  writeStore(store)
  return email
}

export function markEmailRead(id, read = true) {
  const store = readStore()
  store.inboundEmails = store.inboundEmails || []
  const idx = store.inboundEmails.findIndex(m => m.id === id)
  if (idx === -1) return null
  store.inboundEmails[idx] = { ...store.inboundEmails[idx], read: !!read }
  writeStore(store)
  return store.inboundEmails[idx]
}

export function assignEmailToClient(id, clientId) {
  const store = readStore()
  store.inboundEmails = store.inboundEmails || []
  const idx = store.inboundEmails.findIndex(m => m.id === id)
  if (idx === -1) return null
  store.inboundEmails[idx] = { ...store.inboundEmails[idx], clientId: clientId != null ? Number(clientId) : null }
  writeStore(store)
  return store.inboundEmails[idx]
}

export function deleteInboundEmail(id) {
  const store = readStore()
  store.inboundEmails = (store.inboundEmails || []).filter(m => m.id !== id)
  writeStore(store)
  return true
}

export function findClientByEmail(email) {
  if (!email) return null
  const norm = email.toLowerCase().trim()
  return getClients().find(c => (c.email || '').toLowerCase().trim() === norm) || null
}

export function getPaymentLinks(clientId) {
  const all = readStore().paymentLinks || []
  if (clientId != null) return all.filter(p => p.clientId === Number(clientId))
  return all
}

export function savePaymentLink(input) {
  const store = readStore()
  store.paymentLinks = store.paymentLinks || []
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
  if (isNew) store.paymentLinks.unshift(link)
  else {
    const idx = store.paymentLinks.findIndex(p => p.id === id)
    if (idx === -1) store.paymentLinks.unshift(link)
    else store.paymentLinks[idx] = link
  }
  writeStore(store)
  return link
}

export function findPaymentLinkByStripeId(stripeId) {
  return (readStore().paymentLinks || []).find(p => p.stripeId === stripeId)
}

export function getLinkedinPosts() {
  return readStore().linkedinPosts || []
}

export function saveLinkedinPost(input) {
  const store = readStore()
  store.linkedinPosts = store.linkedinPosts || []
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
  if (isNew) store.linkedinPosts.unshift(post)
  else {
    const idx = store.linkedinPosts.findIndex(p => p.id === id)
    if (idx === -1) store.linkedinPosts.unshift(post)
    else store.linkedinPosts[idx] = post
  }
  if (store.linkedinPosts.length > 100) store.linkedinPosts = store.linkedinPosts.slice(0, 100)
  writeStore(store)
  return post
}

export function deleteLinkedinPost(id) {
  const store = readStore()
  store.linkedinPosts = (store.linkedinPosts || []).filter(p => p.id !== id)
  writeStore(store)
  return true
}

export function getLists() {
  return readStore().lists || []
}

export function getList(id) {
  return getLists().find(l => l.id === id)
}

export function saveList(input) {
  const store = readStore()
  store.lists = store.lists || []
  const isNew = !input.id
  const id = input.id || `list_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
  const list = {
    id,
    name: input.name || 'Nouvelle liste',
    clientIds: Array.isArray(input.clientIds) ? input.clientIds.map(Number).filter(n => !isNaN(n)) : [],
    createdAt: input.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
  if (isNew) store.lists.push(list)
  else {
    const idx = store.lists.findIndex(l => l.id === id)
    if (idx === -1) store.lists.push(list)
    else store.lists[idx] = list
  }
  writeStore(store)
  return list
}

export function deleteList(id) {
  const store = readStore()
  store.lists = (store.lists || []).filter(l => l.id !== id)
  writeStore(store)
  return true
}

export function getEmailTemplates() {
  return readStore().emailTemplates || []
}

export function getEmailTemplate(id) {
  return getEmailTemplates().find(t => t.id === id)
}

export function saveEmailTemplate(input) {
  const store = readStore()
  store.emailTemplates = store.emailTemplates || []
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
  if (isNew) store.emailTemplates.push(tpl)
  else {
    const idx = store.emailTemplates.findIndex(t => t.id === id)
    if (idx === -1) store.emailTemplates.push(tpl)
    else store.emailTemplates[idx] = tpl
  }
  writeStore(store)
  return tpl
}

export function deleteEmailTemplate(id) {
  const store = readStore()
  store.emailTemplates = (store.emailTemplates || []).filter(t => t.id !== id)
  writeStore(store)
  return true
}

export function getConfig() {
  const store = readStore()
  return store.config || {}
}

export function setConfig(patch) {
  const store = readStore()
  store.config = { ...(store.config || {}), ...patch }
  writeStore(store)
  return store.config
}

export function logActivity(entry) {
  const store = readStore()
  store.activities = store.activities || []
  const activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    ts: entry.ts || new Date().toISOString(),
    clientId: entry.clientId != null ? Number(entry.clientId) : null,
    type: entry.type,
    payload: entry.payload || {},
  }
  store.activities.push(activity)
  if (store.activities.length > 5000) store.activities = store.activities.slice(-5000)
  writeStore(store)
  return activity
}

export function getActivities(clientId) {
  const acts = readStore().activities || []
  if (clientId != null) return acts.filter(a => a.clientId === Number(clientId))
  return acts
}

export function setPaymentStatus(paymentId, status) {
  const store = readStore()
  const idx = (store.payments || []).findIndex(p => p.id === paymentId)
  if (idx === -1) return null
  store.payments[idx].status = status
  writeStore(store)
  return store.payments[idx]
}
