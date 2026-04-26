'use client'
import { useMemo, useState } from 'react'
import Modal from './Modal'

const STAGES = [
  { id: 'froid',          label: 'Froid',          color: '#7a9bb0', icon: '🧊' },
  { id: 'contacte',       label: 'Contacté',       color: '#6cb6f5', icon: '✉️' },
  { id: 'rdv_programme',  label: 'RDV programmé',  color: '#36e6c4', icon: '📅' },
  { id: 'rdv_fait',       label: 'RDV fait',       color: '#fac775', icon: '🤝' },
  { id: 'proposition',    label: 'Proposition',    color: '#ffaf6b', icon: '📄' },
  { id: 'en_attente',     label: 'En attente',     color: '#b89cff', icon: '⏳' },
  { id: 'signe',          label: 'Signé',          color: '#00e89a', icon: '✅' },
  { id: 'refuse',         label: 'Refusé',         color: '#ff8a89', icon: '❌' },
]

const SOURCES = ['cold', 'linkedin', 'referral', 'inbound', 'event', 'autre']

function emptyProspect(stage = 'froid') {
  return { nom: '', entreprise: '', email: '', telephone: '', linkedin: '', secteur: '', role: '', source: 'cold', stage, estimatedMRR: 0, nextAction: '', notes: '' }
}

export default function Pipeline({ prospects, onProspectsChange, onConvertToClient }) {
  const [editing, setEditing]   = useState(null)
  const [overCol, setOverCol]   = useState(null)
  const [transition, setTransition] = useState(null)

  const byStage = useMemo(() => {
    const m = {}
    STAGES.forEach(s => { m[s.id] = [] })
    prospects.forEach(p => { (m[p.stage] || (m[p.stage] = [])).push(p) })
    return m
  }, [prospects])

  const totals = useMemo(() => {
    const total = prospects.length
    const totalMRR = prospects.reduce((s, p) => s + (Number(p.estimatedMRR) || 0), 0)
    const activeMRR = prospects.filter(p => !['signe', 'refuse'].includes(p.stage)).reduce((s, p) => s + (Number(p.estimatedMRR) || 0), 0)
    return { total, totalMRR, activeMRR }
  }, [prospects])

  const startNew = (stage) => setEditing(emptyProspect(stage))
  const startEdit = (p) => setEditing({ ...p })

  const save = async () => {
    if (!editing.nom || !editing.entreprise) return
    const isEdit = !!editing.id
    const url = isEdit ? `/api/prospects/${editing.id}` : '/api/prospects'
    const method = isEdit ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    const data = await res.json()
    if (data.prospect) {
      onProspectsChange(prev => {
        const idx = prev.findIndex(p => p.id === data.prospect.id)
        if (idx === -1) return [...prev, data.prospect]
        const next = [...prev]; next[idx] = data.prospect; return next
      })
    }
    setEditing(null)
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce prospect ?')) return
    await fetch(`/api/prospects/${id}`, { method: 'DELETE' })
    onProspectsChange(prev => prev.filter(p => p.id !== id))
    setEditing(null)
  }

  const convert = async (prospect) => {
    if (!confirm(`Convertir "${prospect.entreprise}" en client ?`)) return
    const res = await fetch(`/api/prospects/${prospect.id}/convert`, { method: 'POST' })
    const data = await res.json()
    if (data.client) {
      onProspectsChange(prev => prev.filter(p => p.id !== prospect.id))
      onConvertToClient?.(data.client)
      setEditing(null)
    }
  }

  const startDrag = (e, p) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', p.id)
    e.dataTransfer.setData('application/x-nerixi-prospect', p.id)
    setTimeout(() => {
      const el = document.querySelector(`[data-pipe-card="${p.id}"]`)
      if (el) el.classList.add('is-dragging')
    }, 0)
  }
  const endDrag = () => {
    document.querySelectorAll('.pipe-card.is-dragging').forEach(el => el.classList.remove('is-dragging'))
    setOverCol(null)
  }
  const handleOver = (e, sId) => { e.preventDefault(); if (overCol !== sId) setOverCol(sId) }
  const handleDrop = async (e, sId) => {
    e.preventDefault()
    setOverCol(null)
    const id = e.dataTransfer.getData('application/x-nerixi-prospect') || e.dataTransfer.getData('text/plain')
    const p = prospects.find(x => x.id === id)
    if (!p || p.stage === sId) return
    const fromStage = STAGES.find(s => s.id === p.stage)
    const toStage = STAGES.find(s => s.id === sId)
    onProspectsChange(prev => prev.map(x => x.id === id ? { ...x, stage: sId } : x))
    setTransition({ from: fromStage, to: toStage, entreprise: p.entreprise })
    setTimeout(() => setTransition(null), 2400)
    const res = await fetch(`/api/prospects/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...p, stage: sId }),
    })
    const data = await res.json()
    if (!data.prospect) {
      // revert on failure
      onProspectsChange(prev => prev.map(x => x.id === id ? p : x))
    }
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 17 }}>🎯 Pipeline prospection</p>
          <p style={{ color: 'var(--nerixi-muted)', fontSize: 12.5, marginTop: 2 }}>
            {totals.total} prospects · {totals.activeMRR.toLocaleString('fr-FR')}€ MRR potentiel actif · Drag & drop entre étapes
          </p>
        </div>
        <button onClick={() => startNew('froid')} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
          + Nouveau prospect
        </button>
      </div>

      <div className="pipe-grid">
        {STAGES.map(stage => {
          const items = byStage[stage.id] || []
          const sumMRR = items.reduce((s, p) => s + (Number(p.estimatedMRR) || 0), 0)
          return (
            <div key={stage.id}
              className={`pipe-col ${overCol === stage.id ? 'is-drag-over' : ''}`}
              onDragOver={e => handleOver(e, stage.id)}
              onDragLeave={() => setOverCol(o => o === stage.id ? null : o)}
              onDrop={e => handleDrop(e, stage.id)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '4px 4px 8px', borderBottom: '1px solid var(--nerixi-border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: stage.color, boxShadow: `0 0 8px ${stage.color}` }} />
                  <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8 }}>{stage.icon} {stage.label}</p>
                </div>
                <span style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', background: 'rgba(255,255,255,0.05)', padding: '2px 7px', borderRadius: 999, fontWeight: 600 }}>
                  {items.length}{sumMRR > 0 ? ` · ${sumMRR}€` : ''}
                </span>
              </div>

              {items.length === 0 ? (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 11.5, fontStyle: 'italic', border: '1px dashed var(--nerixi-border)', borderRadius: 8 }}>
                  Glisse un prospect ici
                </div>
              ) : items.map(p => (
                <div key={p.id} data-pipe-card={p.id} className="pipe-card"
                  draggable
                  onDragStart={e => startDrag(e, p)}
                  onDragEnd={endDrag}
                  onClick={() => startEdit(p)}
                >
                  <p style={{ fontWeight: 700, fontSize: 12.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.entreprise}</p>
                  <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.nom}{p.role ? ` · ${p.role}` : ''}</p>
                  {p.estimatedMRR > 0 && (
                    <p style={{ fontSize: 11.5, color: 'var(--nerixi-accent)', fontWeight: 700, marginTop: 4 }}>{p.estimatedMRR}€/mois</p>
                  )}
                  {p.nextAction && (
                    <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {p.nextAction}</p>
                  )}
                </div>
              ))}

              <button onClick={() => startNew(stage.id)}
                style={{ width: '100%', marginTop: 'auto', background: 'transparent', border: '1px dashed var(--nerixi-border)', color: 'var(--nerixi-muted)', borderRadius: 8, padding: '6px', fontSize: 11.5, cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = stage.color; e.currentTarget.style.color = stage.color }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nerixi-border)'; e.currentTarget.style.color = 'var(--nerixi-muted)' }}
              >+ Ajouter ici</button>
            </div>
          )
        })}
      </div>

      {transition && (
        <div className="fade-in-up" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(120deg, rgba(20,35,64,0.95), rgba(10,22,40,0.95))',
          border: `1px solid ${transition.to.color}55`, borderRadius: 12,
          padding: '12px 18px', zIndex: 70,
          backdropFilter: 'blur(8px)',
          boxShadow: `0 16px 40px rgba(0,0,0,0.4)`,
        }}>
          <p style={{ fontSize: 13, fontWeight: 700 }}>{transition.entreprise}</p>
          <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 2 }}>
            {transition.from?.label || '?'} → <span style={{ color: transition.to.color }}>{transition.to.label}</span>
          </p>
        </div>
      )}

      {editing && (
        <ProspectModal
          prospect={editing}
          onChange={setEditing}
          onClose={() => setEditing(null)}
          onSave={save}
          onDelete={editing.id ? () => remove(editing.id) : null}
          onConvert={editing.id ? () => convert(editing) : null}
        />
      )}
    </div>
  )
}

function ProspectModal({ prospect, onChange, onClose, onSave, onDelete, onConvert }) {
  return (
    <Modal onClose={onClose} zIndex={200} contentStyle={{ maxWidth: 600 }}>
        <button onClick={onClose} className="modal-close">✕</button>
        <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 16 }}>
          {prospect.id ? 'Modifier le prospect' : 'Nouveau prospect'}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label>Contact</label><input value={prospect.nom || ''} onChange={e => onChange({ ...prospect, nom: e.target.value })} placeholder="Pierre Martin" /></div>
          <div><label>Entreprise</label><input value={prospect.entreprise || ''} onChange={e => onChange({ ...prospect, entreprise: e.target.value })} placeholder="Martin Commerce" /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label>Email</label><input value={prospect.email || ''} onChange={e => onChange({ ...prospect, email: e.target.value })} placeholder="contact@..." /></div>
          <div><label>Téléphone</label><input value={prospect.telephone || ''} onChange={e => onChange({ ...prospect, telephone: e.target.value })} placeholder="06 ..." /></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label>Étape</label>
            <select value={prospect.stage || 'froid'} onChange={e => onChange({ ...prospect, stage: e.target.value })}>
              {STAGES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.label}</option>)}
            </select>
          </div>
          <div><label>Source</label>
            <select value={prospect.source || 'cold'} onChange={e => onChange({ ...prospect, source: e.target.value })}>
              {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div><label>MRR estimé (€/mois)</label>
            <input type="number" min="0" value={prospect.estimatedMRR || 0} onChange={e => onChange({ ...prospect, estimatedMRR: e.target.value })} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div><label>Secteur</label><input value={prospect.secteur || ''} onChange={e => onChange({ ...prospect, secteur: e.target.value })} placeholder="Commerce, BTP..." /></div>
          <div><label>Rôle</label><input value={prospect.role || ''} onChange={e => onChange({ ...prospect, role: e.target.value })} placeholder="DG, Fondateur..." /></div>
        </div>

        <div style={{ marginBottom: 12 }}><label>LinkedIn</label><input value={prospect.linkedin || ''} onChange={e => onChange({ ...prospect, linkedin: e.target.value })} placeholder="https://linkedin.com/in/..." /></div>

        <div style={{ marginBottom: 12 }}><label>Prochaine action</label><input value={prospect.nextAction || ''} onChange={e => onChange({ ...prospect, nextAction: e.target.value })} placeholder="Ex: Relance dans 3 jours" /></div>

        <div style={{ marginBottom: 16 }}><label>Notes</label><textarea rows={3} value={prospect.notes || ''} onChange={e => onChange({ ...prospect, notes: e.target.value })} placeholder="Notes internes..." /></div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {onDelete && <button onClick={onDelete} style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', color: '#ff8a89', borderRadius: 10, padding: '11px 16px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Supprimer</button>}
          {onConvert && <button onClick={onConvert} style={{ background: 'linear-gradient(120deg, #00e89a, #36e6c4)', border: 'none', color: '#06101f', borderRadius: 10, padding: '11px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>✅ Convertir en client</button>}
          <button onClick={onSave} className="btn-primary" style={{ flex: 1, minWidth: 140 }}>{prospect.id ? 'Enregistrer' : 'Créer'}</button>
        </div>
    </Modal>
  )
}
