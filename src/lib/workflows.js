import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const WF_FILE = path.join(DATA_DIR, 'workflows.json')

export const TRIGGER_TYPES = [
  { type: 'client.created',         label: 'Nouveau client',          icon: '🌟' },
  { type: 'client.status_changed',  label: 'Changement de statut',    icon: '🔄' },
  { type: 'payment.received',       label: 'Paiement reçu',           icon: '💰' },
  { type: 'payment.failed',         label: 'Paiement échoué',         icon: '⚠️' },
  { type: 'onboarding.triggered',   label: 'Onboarding lancé',        icon: '🚀' },
]

export const ACTION_TYPES = [
  { type: 'send_email',     label: 'Envoyer un email',  icon: '📧' },
  { type: 'create_event',   label: 'Créer un rappel',   icon: '📅' },
  { type: 'trigger_n8n',    label: 'Webhook n8n',       icon: '🔌' },
  { type: 'update_status',  label: 'Changer le statut', icon: '🏷️' },
  { type: 'log_note',       label: 'Ajouter une note',  icon: '📝' },
]

function ensureDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }) } catch {}
}

function read() {
  ensureDir()
  if (!fs.existsSync(WF_FILE)) {
    const seed = defaultWorkflows()
    fs.writeFileSync(WF_FILE, JSON.stringify(seed, null, 2))
    return seed
  }
  try { return JSON.parse(fs.readFileSync(WF_FILE, 'utf8')) } catch { return { workflows: [] } }
}

function write(data) {
  ensureDir()
  fs.writeFileSync(WF_FILE, JSON.stringify(data, null, 2))
}

function defaultWorkflows() {
  return {
    workflows: [
      {
        id: 'wf_seed_welcome',
        name: 'Bienvenue nouveau client',
        enabled: false,
        createdAt: new Date().toISOString(),
        trigger: { type: 'client.created', config: {} },
        actions: [
          { id: 'a1', type: 'send_email',   config: { template: 'welcome', subject: 'Bienvenue chez Nerixi !', content: 'Bonjour {prenom},\n\nMerci de nous faire confiance.' } },
          { id: 'a2', type: 'create_event', config: { title: 'Premier point de cadrage', daysFromNow: 3, time: '10:00', type: 'meeting' } },
          { id: 'a3', type: 'trigger_n8n',  config: { url: '' } },
        ],
      },
      {
        id: 'wf_seed_paid',
        name: 'Paiement reçu — confirmation',
        enabled: false,
        createdAt: new Date().toISOString(),
        trigger: { type: 'payment.received', config: {} },
        actions: [
          { id: 'a1', type: 'send_email', config: { template: 'thanks', subject: 'Merci pour votre paiement', content: 'Bonjour {prenom},\n\nNous confirmons la bonne réception de votre paiement.' } },
          { id: 'a2', type: 'log_note',  config: { note: 'Paiement reçu — confirmation envoyée' } },
        ],
      },
      {
        id: 'wf_seed_actif',
        name: 'Passage en Actif',
        enabled: false,
        createdAt: new Date().toISOString(),
        trigger: { type: 'client.status_changed', config: { to: 'actif' } },
        actions: [
          { id: 'a1', type: 'create_event', config: { title: 'Démarrage projet · {entreprise}', daysFromNow: 2, time: '09:30', type: 'meeting' } },
          { id: 'a2', type: 'trigger_n8n',  config: { url: '' } },
        ],
      },
    ],
  }
}

export function getWorkflows() {
  return read().workflows || []
}

export function getWorkflow(id) {
  return getWorkflows().find(w => w.id === id)
}

export function saveWorkflow(input) {
  const data = read()
  const wfs = data.workflows || []
  const isNew = !input.id
  const id = input.id || `wf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
  const wf = {
    id,
    name: input.name || 'Sans titre',
    enabled: !!input.enabled,
    createdAt: input.createdAt || new Date().toISOString(),
    trigger: input.trigger || { type: 'client.created', config: {} },
    actions: Array.isArray(input.actions) ? input.actions : [],
  }
  if (isNew) wfs.push(wf)
  else {
    const idx = wfs.findIndex(w => w.id === id)
    if (idx === -1) wfs.push(wf)
    else wfs[idx] = wf
  }
  data.workflows = wfs
  write(data)
  return wf
}

export function deleteWorkflow(id) {
  const data = read()
  data.workflows = (data.workflows || []).filter(w => w.id !== id)
  write(data)
}

function triggerMatches(wf, eventType, ctx) {
  if (wf.trigger.type !== eventType) return false
  const cfg = wf.trigger.config || {}
  if (eventType === 'client.status_changed') {
    if (cfg.to && ctx.to !== cfg.to) return false
    if (cfg.from && ctx.from !== cfg.from) return false
  }
  return true
}

function interpolate(str, vars) {
  if (typeof str !== 'string') return str
  return str.replace(/{(\w+)}/g, (_, k) => vars[k] != null ? vars[k] : `{${k}}`)
}

async function executeAction(action, ctx) {
  const cfg = action.config || {}
  const client = ctx.client
  if (!client && action.type !== 'trigger_n8n') return { skipped: 'no_client' }
  const vars = client ? {
    prenom:     client.nom?.split(' ')?.[0] || '',
    nom:        client.nom || '',
    entreprise: client.entreprise || '',
    email:      client.email || '',
    secteur:    client.secteur || '',
    statut:     client.statut || '',
    mrr:        client.mrr || 0,
  } : {}

  try {
    if (action.type === 'send_email') {
      if (!client?.email) return { error: 'no_email' }
      const subject = interpolate(cfg.subject || '', vars)
      const content = interpolate(cfg.content || '', vars).replace(/\n/g, '<br>')
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
      const res = await fetch(`${baseUrl}/api/send-email`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Internal-Workflow': '1' },
        body: JSON.stringify({ to: client.email, toName: client.nom, subject, content: `<p>${content}</p>` }),
      })
      const data = await res.json().catch(() => ({}))
      return { type: 'send_email', success: !!data.success, error: data.error }
    }
    if (action.type === 'create_event') {
      const days = Number(cfg.daysFromNow) || 0
      const date = new Date(Date.now() + days * 86400000).toISOString().slice(0, 10)
      const { createEvent } = await import('./store.js')
      const ev = createEvent({
        clientId: client?.id,
        date,
        time: cfg.time || '09:00',
        title: interpolate(cfg.title || 'Rappel', vars),
        type: cfg.type || 'reminder',
        notes: interpolate(cfg.notes || '', vars),
      })
      return { type: 'create_event', success: !!ev, eventId: ev?.id }
    }
    if (action.type === 'trigger_n8n') {
      const url = cfg.url || process.env.N8N_WEBHOOK_URL || ''
      if (!url) return { type: 'trigger_n8n', skipped: 'no_url' }
      const body = JSON.stringify({
        event: 'workflow.action',
        timestamp: new Date().toISOString(),
        source: 'nerixi-crm',
        client, ctx,
      })
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: AbortSignal.timeout(8000),
      }).catch(e => ({ ok: false, _err: e.message }))
      return { type: 'trigger_n8n', success: !!res?.ok, error: res?._err }
    }
    if (action.type === 'update_status') {
      if (!client) return { skipped: 'no_client' }
      const { updateClient } = await import('./store.js')
      const newStatus = cfg.to || 'actif'
      if (newStatus === client.statut) return { skipped: 'same_status' }
      const result = updateClient(client.id, { ...client, statut: newStatus })
      return { type: 'update_status', success: !!result?.client, newStatus }
    }
    if (action.type === 'log_note') {
      const { logActivity } = await import('./store.js')
      logActivity({
        clientId: client?.id,
        type: 'workflow_note',
        payload: { note: interpolate(cfg.note || '', vars) },
      })
      return { type: 'log_note', success: true }
    }
    return { error: 'unknown_action_type' }
  } catch (e) {
    return { type: action.type, error: e.message }
  }
}

export async function runWorkflowsForEvent(eventType, ctx = {}) {
  const wfs = getWorkflows().filter(w => w.enabled && triggerMatches(w, eventType, ctx))
  if (wfs.length === 0) return { ran: 0, results: [] }

  const { logActivity } = await import('./store.js')
  const results = []
  for (const wf of wfs) {
    const actionResults = []
    for (const action of wf.actions || []) {
      const r = await executeAction(action, ctx)
      actionResults.push({ actionId: action.id, type: action.type, ...r })
    }
    logActivity({
      clientId: ctx.client?.id || null,
      type: 'workflow_executed',
      payload: { workflowId: wf.id, name: wf.name, eventType, results: actionResults },
    })
    results.push({ workflowId: wf.id, name: wf.name, results: actionResults })
  }
  return { ran: wfs.length, results }
}
