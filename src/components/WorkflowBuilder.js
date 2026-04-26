'use client'
import { useEffect, useMemo, useState } from 'react'

const TRIGGERS = [
  { type: 'client.created',         label: 'Nouveau client',          icon: '🌟', desc: 'Quand un client est créé dans le CRM' },
  { type: 'client.status_changed',  label: 'Changement de statut',    icon: '🔄', desc: 'Quand le statut change (Kanban)' },
  { type: 'payment.received',       label: 'Paiement reçu',           icon: '💰', desc: 'Quand Stripe reçoit un paiement' },
  { type: 'payment.failed',         label: 'Paiement échoué',         icon: '⚠️', desc: 'Quand un paiement Stripe échoue' },
  { type: 'onboarding.triggered',   label: 'Onboarding lancé',        icon: '🚀', desc: 'Quand un onboarding n8n est déclenché' },
]

const ACTIONS = [
  { type: 'send_email',     label: 'Envoyer email',    icon: '📧', desc: 'Email Brevo au client' },
  { type: 'create_event',   label: 'Créer rappel',     icon: '📅', desc: 'Ajout dans l\'agenda' },
  { type: 'trigger_n8n',    label: 'Webhook n8n',      icon: '🔌', desc: 'POST vers une URL' },
  { type: 'update_status',  label: 'Changer statut',   icon: '🏷️', desc: 'Modifie le statut du client' },
  { type: 'log_note',       label: 'Ajouter note',     icon: '📝', desc: 'Note dans la timeline' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Tous' },
  { value: 'prospect', label: 'Prospect' },
  { value: 'en-cours', label: 'En cours' },
  { value: 'actif', label: 'Actif' },
  { value: 'churné', label: 'Churné' },
]

function emptyWorkflow() {
  return {
    name: 'Nouveau workflow',
    enabled: false,
    trigger: { type: 'client.created', config: {} },
    actions: [{ id: 'a1', type: 'send_email', config: { subject: 'Bonjour {prenom}', content: 'Hello {prenom},\n\nMessage automatique.' } }],
  }
}

function Cable({ length = 60 }) {
  return (
    <div className="wf-cable">
      <svg width={length} height="48" viewBox={`0 0 ${length} 48`}>
        <defs>
          <linearGradient id="wf-cable-grad" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#fac775" />
            <stop offset="100%" stopColor="#00e89a" />
          </linearGradient>
        </defs>
        <path
          d={`M 0 24 C ${length / 3} 24, ${(length * 2) / 3} 24, ${length} 24`}
          stroke="url(#wf-cable-grad)" strokeWidth="2.5" fill="none" strokeLinecap="round"
          style={{ filter: 'drop-shadow(0 0 4px rgba(0,200,120,0.4))' }}
        />
        <circle cx="6" cy="24" r="3" fill="#fac775" />
        <circle cx={length - 6} cy="24" r="3" fill="#00e89a">
          <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  )
}

export default function WorkflowBuilder() {
  const [workflows, setWorkflows] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [selectedNode, setSelectedNode] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/workflows', { cache: 'no-store' })
      const data = await res.json()
      setWorkflows(data.workflows || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const startNew = () => { setEditing(emptyWorkflow()); setSelectedNode({ kind: 'trigger' }) }
  const startEdit = (wf) => { setEditing(JSON.parse(JSON.stringify(wf))); setSelectedNode({ kind: 'trigger' }) }

  const save = async () => {
    setSaving(true)
    setError('')
    try {
      const url = editing.id ? `/api/workflows/${editing.id}` : '/api/workflows'
      const method = editing.id ? 'PUT' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      await load()
      setEditing(null)
      setSelectedNode(null)
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce workflow ?')) return
    await fetch(`/api/workflows/${id}`, { method: 'DELETE' })
    await load()
  }

  const toggle = async (wf) => {
    const next = { ...wf, enabled: !wf.enabled }
    setWorkflows(prev => prev.map(w => w.id === wf.id ? next : w))
    await fetch(`/api/workflows/${wf.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next) })
  }

  const addAction = (type) => {
    setEditing(e => ({
      ...e,
      actions: [...(e.actions || []), { id: `a${Date.now()}`, type, config: {} }],
    }))
    setSelectedNode({ kind: 'action', index: editing?.actions?.length || 0 })
  }

  const removeAction = (idx) => {
    setEditing(e => ({ ...e, actions: e.actions.filter((_, i) => i !== idx) }))
    setSelectedNode(null)
  }

  const updateTrigger = (patch) => {
    setEditing(e => ({ ...e, trigger: { ...e.trigger, ...patch, config: { ...(e.trigger.config || {}), ...(patch.config || {}) } } }))
  }
  const updateAction = (idx, patch) => {
    setEditing(e => ({
      ...e,
      actions: e.actions.map((a, i) => i === idx ? { ...a, ...patch, config: { ...(a.config || {}), ...(patch.config || {}) } } : a),
    }))
  }

  const renderTriggerNode = () => {
    const t = TRIGGERS.find(x => x.type === editing.trigger.type) || TRIGGERS[0]
    const cfg = editing.trigger.config || {}
    const isSel = selectedNode?.kind === 'trigger'
    let desc = t.desc
    if (editing.trigger.type === 'client.status_changed' && cfg.to) desc = `Quand le statut passe à "${cfg.to}"`
    return (
      <div className={`wf-node is-trigger ${isSel ? 'is-selected' : ''}`} onClick={() => setSelectedNode({ kind: 'trigger' })}>
        <div className="wf-node-head">
          <span className="icon">{t.icon}</span>
          <span className="wf-node-title">{t.label}</span>
          <span className="wf-node-tag">Trigger</span>
        </div>
        <p className="wf-node-desc">{desc}</p>
      </div>
    )
  }

  const renderActionNode = (a, idx) => {
    const meta = ACTIONS.find(x => x.type === a.type) || { label: a.type, icon: '⚙️', desc: '' }
    const isSel = selectedNode?.kind === 'action' && selectedNode.index === idx
    let desc = meta.desc
    if (a.type === 'send_email' && a.config?.subject) desc = `Sujet : ${a.config.subject}`
    if (a.type === 'create_event' && a.config?.title) desc = `${a.config.title} · J+${a.config.daysFromNow || 0}`
    if (a.type === 'trigger_n8n') desc = a.config?.url || '(URL n8n par défaut)'
    if (a.type === 'update_status') desc = `→ ${a.config?.to || 'actif'}`
    if (a.type === 'log_note' && a.config?.note) desc = a.config.note.slice(0, 80)
    return (
      <div key={a.id} className={`wf-node is-action ${isSel ? 'is-selected' : ''}`} onClick={() => setSelectedNode({ kind: 'action', index: idx })}>
        <div className="wf-node-head">
          <span className="icon">{meta.icon}</span>
          <span className="wf-node-title">{meta.label}</span>
          <span className="wf-node-tag">Action</span>
        </div>
        <p className="wf-node-desc">{desc}</p>
      </div>
    )
  }

  const renderInspector = () => {
    if (!selectedNode) {
      return <p style={{ fontSize: 13, color: 'var(--nerixi-muted)', padding: '12px 4px' }}>Sélectionne un nœud pour le configurer.</p>
    }
    if (selectedNode.kind === 'trigger') {
      const t = editing.trigger
      return (
        <div>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700, marginBottom: 12 }}>Trigger</p>
          <label>Type d'événement</label>
          <select value={t.type} onChange={e => updateTrigger({ type: e.target.value, config: {} })}>
            {TRIGGERS.map(x => <option key={x.type} value={x.type}>{x.icon} {x.label}</option>)}
          </select>

          {t.type === 'client.status_changed' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 12 }}>
              <div>
                <label>Depuis</label>
                <select value={t.config?.from || ''} onChange={e => updateTrigger({ config: { from: e.target.value } })}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
              <div>
                <label>Vers</label>
                <select value={t.config?.to || ''} onChange={e => updateTrigger({ config: { to: e.target.value } })}>
                  {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>
      )
    }

    const idx = selectedNode.index
    const a = editing.actions[idx]
    if (!a) return null

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Action #{idx + 1}</p>
          <button onClick={() => removeAction(idx)} style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 6, color: '#ff8a89', padding: '3px 10px', fontSize: 11, cursor: 'pointer' }}>Supprimer</button>
        </div>
        <label>Type</label>
        <select value={a.type} onChange={e => updateAction(idx, { type: e.target.value, config: {} })}>
          {ACTIONS.map(x => <option key={x.type} value={x.type}>{x.icon} {x.label}</option>)}
        </select>

        {a.type === 'send_email' && (
          <div style={{ marginTop: 10 }}>
            <label>Sujet (variables : {'{prenom}'} {'{entreprise}'})</label>
            <input value={a.config?.subject || ''} onChange={e => updateAction(idx, { config: { subject: e.target.value } })} placeholder="Bonjour {prenom}" />
            <label style={{ marginTop: 10 }}>Contenu</label>
            <textarea rows={5} value={a.config?.content || ''} onChange={e => updateAction(idx, { config: { content: e.target.value } })} placeholder="Bonjour {prenom},..." />
          </div>
        )}

        {a.type === 'create_event' && (
          <div style={{ marginTop: 10 }}>
            <label>Titre</label>
            <input value={a.config?.title || ''} onChange={e => updateAction(idx, { config: { title: e.target.value } })} placeholder="Point de cadrage · {entreprise}" />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 10 }}>
              <div>
                <label>Dans X jours</label>
                <input type="number" min="0" value={a.config?.daysFromNow ?? 0} onChange={e => updateAction(idx, { config: { daysFromNow: Number(e.target.value) } })} />
              </div>
              <div>
                <label>Heure</label>
                <input type="time" value={a.config?.time || '09:00'} onChange={e => updateAction(idx, { config: { time: e.target.value } })} />
              </div>
              <div>
                <label>Type</label>
                <select value={a.config?.type || 'reminder'} onChange={e => updateAction(idx, { config: { type: e.target.value } })}>
                  <option value="reminder">Rappel</option>
                  <option value="meeting">RDV</option>
                  <option value="demo">Démo</option>
                  <option value="delivery">Livraison</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {a.type === 'trigger_n8n' && (
          <div style={{ marginTop: 10 }}>
            <label>URL n8n (vide = N8N_WEBHOOK_URL)</label>
            <input value={a.config?.url || ''} onChange={e => updateAction(idx, { config: { url: e.target.value } })} placeholder="https://n8n.../webhook/..." />
          </div>
        )}

        {a.type === 'update_status' && (
          <div style={{ marginTop: 10 }}>
            <label>Nouveau statut</label>
            <select value={a.config?.to || 'actif'} onChange={e => updateAction(idx, { config: { to: e.target.value } })}>
              <option value="prospect">Prospect</option>
              <option value="en-cours">En cours</option>
              <option value="actif">Actif</option>
              <option value="churné">Churné</option>
            </select>
          </div>
        )}

        {a.type === 'log_note' && (
          <div style={{ marginTop: 10 }}>
            <label>Note</label>
            <textarea rows={3} value={a.config?.note || ''} onChange={e => updateAction(idx, { config: { note: e.target.value } })} placeholder="{entreprise} a déclenché ce workflow" />
          </div>
        )}
      </div>
    )
  }

  // ───────── EDIT MODE ─────────
  if (editing) {
    return (
      <div className="fade-in">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flex: 1, minWidth: 0 }}>
            <button onClick={() => { setEditing(null); setSelectedNode(null) }}
              style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--nerixi-border)', color: 'var(--nerixi-text)', cursor: 'pointer', flexShrink: 0 }}>←</button>
            <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
              style={{ fontSize: 22, fontWeight: 800, background: 'transparent', border: 'none', padding: 0 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>Activé</span>
            <div className={`toggle ${editing.enabled ? 'is-on' : ''}`} onClick={() => setEditing({ ...editing, enabled: !editing.enabled })} />
            <button className="btn-primary" onClick={save} disabled={saving}>
              {saving ? <><span className="spinner" /> &nbsp;Enregistrement…</> : 'Enregistrer'}
            </button>
          </div>
        </div>

        {error && <p style={{ color: '#ff8a89', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}

        <div className="wf-palette">
          <span style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, padding: '7px 0' }}>+ Ajouter une action :</span>
          {ACTIONS.map(a => (
            <button key={a.type} onClick={() => addAction(a.type)} className="wf-palette-item">
              <span>{a.icon}</span> {a.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(280px, 1fr)', gap: 18 }}>
          <div className="wf-canvas">
            <div className="wf-row">
              {renderTriggerNode()}
              {(editing.actions || []).map((a, i) => (
                <div key={a.id} style={{ display: 'flex', gap: 18, alignItems: 'stretch' }}>
                  <Cable />
                  {renderActionNode(a, i)}
                </div>
              ))}
              <Cable length={50} />
              <button className="wf-add-btn" onClick={() => addAction('send_email')} title="Ajouter une action">+</button>
            </div>
          </div>

          <div className="card" style={{ position: 'sticky', top: 16, alignSelf: 'flex-start' }}>
            {renderInspector()}
          </div>
        </div>
      </div>
    )
  }

  // ───────── LIST MODE ─────────
  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>🤖 Automatisations</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            Crée des workflows visuels qui se déclenchent automatiquement sur tes événements CRM.
          </p>
        </div>
        <button className="btn-primary" onClick={startNew}>+ Nouveau workflow</button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 30, color: 'var(--nerixi-muted)' }}>
          <span className="spinner" />
        </div>
      ) : workflows.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🤖</p>
          <p>Aucun workflow encore.</p>
          <button className="btn-primary" onClick={startNew} style={{ marginTop: 14 }}>+ Créer mon premier workflow</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {workflows.map(wf => {
            const t = TRIGGERS.find(x => x.type === wf.trigger?.type)
            return (
              <div key={wf.id} className="wf-list-card fade-in-up" onClick={() => startEdit(wf)}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(0,200,120,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                  {t?.icon || '⚙️'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{wf.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {t?.label || wf.trigger?.type} · {wf.actions?.length || 0} action{(wf.actions?.length || 0) > 1 ? 's' : ''}
                  </p>
                </div>
                <div onClick={e => e.stopPropagation()} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span style={{ fontSize: 11, color: wf.enabled ? 'var(--nerixi-accent)' : 'var(--nerixi-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>
                    {wf.enabled ? 'Actif' : 'Off'}
                  </span>
                  <div className={`toggle ${wf.enabled ? 'is-on' : ''}`} onClick={() => toggle(wf)} />
                  <button onClick={() => remove(wf.id)} title="Supprimer"
                    style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', color: '#ff8a89', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: 12 }}>✕</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
