'use client'
import { useState } from 'react'

const COLUMNS = [
  { id: 'prospect', label: 'Prospect', color: '#6cb6f5', icon: '🌱' },
  { id: 'en-cours', label: 'En cours', color: '#fac775', icon: '⚙️' },
  { id: 'actif',    label: 'Actif',    color: '#00e89a', icon: '🚀' },
  { id: 'churné',   label: 'Churné',   color: '#b89cff', icon: '⚰️' },
]

export default function Kanban({ clients, onChangeStatus, onOpenClient, onTimeline, onConvertProspect }) {
  const [dragId, setDragId] = useState(null)
  const [overCol, setOverCol] = useState(null)
  const [transition, setTransition] = useState(null)

  const startDrag = (e, client) => {
    setDragId(client.id)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(client.id))
    e.dataTransfer.setData('application/x-nerixi-client', String(client.id))
    setTimeout(() => {
      const el = document.querySelector(`[data-kanban-card="${client.id}"]`)
      if (el) el.classList.add('is-dragging')
    }, 0)
  }

  const endDrag = () => {
    document.querySelectorAll('.kanban-card.is-dragging').forEach(el => el.classList.remove('is-dragging'))
    setDragId(null)
    setOverCol(null)
  }

  const handleOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (overCol !== colId) setOverCol(colId)
  }

  const handleDrop = async (e, colId) => {
    e.preventDefault()
    setOverCol(null)

    // Prospect drag-drop → conversion auto
    const prospectId = e.dataTransfer.getData('application/x-nerixi-prospect')
    if (prospectId) {
      const toCol = COLUMNS.find(c => c.id === colId)
      setTransition({ from: { label: 'Prospect', icon: '🎯', color: '#fac775' }, to: toCol, entreprise: 'Conversion en client…' })
      setTimeout(() => setTransition(null), 2800)
      await onConvertProspect?.(prospectId, colId)
      return
    }

    // Client drag-drop classique
    const idStr = e.dataTransfer.getData('application/x-nerixi-client') || e.dataTransfer.getData('text/plain')
    const id = Number(idStr)
    if (!id) return
    const client = clients.find(c => c.id === id)
    if (!client || client.statut === colId) return

    const fromCol = COLUMNS.find(c => c.id === client.statut)
    const toCol   = COLUMNS.find(c => c.id === colId)
    setTransition({ from: fromCol, to: toCol, entreprise: client.entreprise })
    setTimeout(() => setTransition(null), 2400)

    await onChangeStatus(client, colId)
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>🎯 Pipeline · Kanban</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            Drag & drop entre colonnes — chaque transition déclenche un webhook n8n
          </p>
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          {COLUMNS.map(c => (
            <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c.color, boxShadow: `0 0 8px ${c.color}` }} />
              {clients.filter(x => x.statut === c.id).length} {c.label.toLowerCase()}
            </span>
          ))}
        </div>
      </div>

      <div className="kanban-grid">
        {COLUMNS.map(col => {
          const cols = clients.filter(c => c.statut === col.id)
          const isOver = overCol === col.id
          return (
            <div
              key={col.id}
              className={`kanban-col ${isOver ? 'is-drag-over' : ''}`}
              onDragOver={e => handleOver(e, col.id)}
              onDragLeave={() => setOverCol(o => o === col.id ? null : o)}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="kanban-col-header">
                <span className="title">
                  <span className="dot" style={{ background: col.color, boxShadow: `0 0 10px ${col.color}` }} />
                  {col.icon} {col.label}
                </span>
                <span className="kanban-count">{cols.length}</span>
              </div>

              {cols.length === 0 ? (
                <div className="kanban-empty">
                  {isOver ? `↓ Lâcher ici pour passer "${col.label}"` : 'Aucun client'}
                </div>
              ) : cols.map(c => (
                <div
                  key={c.id}
                  data-kanban-card={c.id}
                  className="kanban-card"
                  draggable
                  onDragStart={e => startDrag(e, c)}
                  onDragEnd={endDrag}
                  onClick={() => onOpenClient?.(c)}
                  onDoubleClick={() => onTimeline?.(c)}
                >
                  <p className="kanban-card-name">
                    {c.entreprise} {c.onboarding?.status === 'sent' && <span style={{ fontSize: 10 }}>🚀</span>}
                  </p>
                  <p className="kanban-card-meta">{c.nom} · {c.secteur || '—'}</p>
                  <div className="kanban-card-foot">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      <span style={{ width: 32, height: 4, borderRadius: 4, background: 'rgba(255,255,255,0.06)', position: 'relative', overflow: 'hidden' }}>
                        <span style={{ position: 'absolute', inset: 0, width: `${c.avancement || 0}%`, background: col.color, borderRadius: 4 }} />
                      </span>
                      {c.avancement || 0}%
                    </span>
                    <span className="kanban-card-mrr">{c.mrr ? `${c.mrr}€` : '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>

      {transition && (
        <div className="fade-in-up" style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'linear-gradient(120deg, rgba(20,35,64,0.95), rgba(10,22,40,0.95))',
          border: `1px solid ${transition.to.color}55`,
          borderRadius: 12, padding: '12px 18px',
          boxShadow: `0 16px 40px rgba(0,0,0,0.4), 0 0 0 1px ${transition.to.color}20`,
          backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', gap: 12, zIndex: 70,
          maxWidth: '90vw',
        }}>
          <span style={{ fontSize: 18 }}>{transition.to.icon}</span>
          <div>
            <p style={{ fontSize: 13, fontWeight: 700 }}>{transition.entreprise}</p>
            <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 2 }}>
              {transition.from?.label || '?'} → <span style={{ color: transition.to.color }}>{transition.to.label}</span> · webhook n8n envoyé
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
