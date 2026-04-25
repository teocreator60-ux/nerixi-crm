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
  return { clients, payments, events, nextClientId: Math.max(...clients.map(c => c.id)) + 1 }
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
  writeStore(store)
  return next
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

export function setPaymentStatus(paymentId, status) {
  const store = readStore()
  const idx = (store.payments || []).findIndex(p => p.id === paymentId)
  if (idx === -1) return null
  store.payments[idx].status = status
  writeStore(store)
  return store.payments[idx]
}
