'use client'
import { useEffect, useState } from 'react'

const PRIORITIES = [
  { value: 'high', label: 'Haute',   className: 'high' },
  { value: 'med',  label: 'Moyenne', className: 'med'  },
  { value: 'low',  label: 'Basse',   className: 'low'  },
]

const PRIO_ORDER = { high: 0, med: 1, low: 2 }

function isOverdue(dueDate) {
  if (!dueDate) return false
  const today = new Date().toISOString().slice(0, 10)
  return dueDate < today
}

function fmtDue(due) {
  if (!due) return ''
  const d = new Date(due + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const diff = Math.round((d - today) / 86400000)
  if (diff === 0) return "Aujourd'hui"
  if (diff === 1) return 'Demain'
  if (diff === -1) return 'Hier'
  if (diff > 0 && diff < 7) return `Dans ${diff} j`
  if (diff < 0 && diff > -30) return `Il y a ${-diff} j`
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export function TaskRow({ task, client, onToggle, onDelete, onEdit, showClient }) {
  const overdue = !task.done && isOverdue(task.dueDate)
  return (
    <div className={`task-row ${task.done ? 'is-done' : ''}`}>
      <button
        className={`task-checkbox ${task.done ? 'is-done' : ''}`}
        onClick={() => onToggle(task)}
        title={task.done ? 'Marquer non fait' : 'Marquer fait'}
      >{task.done ? '✓' : ''}</button>
      <span className={`prio-dot ${task.priority || 'med'}`} title={`Priorité ${PRIORITIES.find(p => p.value === task.priority)?.label || ''}`} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p className="task-title" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {task.title}
          {task.dueDate && <span className={`task-due ${overdue ? 'is-overdue' : ''}`}> · {fmtDue(task.dueDate)}</span>}
        </p>
        {showClient && client && (
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {client.entreprise}
          </p>
        )}
      </div>
      {onEdit && (
        <button onClick={() => onEdit(task)} title="Modifier"
          style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 6, color: 'var(--nerixi-muted)', cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>✎</button>
      )}
      {onDelete && (
        <button onClick={() => onDelete(task.id)} title="Supprimer"
          style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 6, color: '#ff8a89', cursor: 'pointer', padding: '3px 8px', fontSize: 11 }}>✕</button>
      )}
    </div>
  )
}

export function TaskFormModal({ initial, onClose, onSave, clients = [] }) {
  const [form, setForm] = useState(() => ({
    id: initial?.id || null,
    clientId: initial?.clientId || '',
    title: initial?.title || '',
    priority: initial?.priority || 'med',
    dueDate: initial?.dueDate || '',
    notes: initial?.notes || '',
    done: initial?.done || false,
  }))
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    if (!form.title.trim()) return
    setSaving(true)
    await onSave({ ...form, clientId: form.clientId === '' ? null : Number(form.clientId) })
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 165 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <button onClick={onClose} className="modal-close">✕</button>
        <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{form.id ? 'Modifier la tâche' : 'Nouvelle tâche'}</p>

        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label>Titre</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Ex: Relancer Pierre Martin" required autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>Priorité</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {PRIORITIES.map(p => (
                  <button key={p.value} type="button" onClick={() => setForm({ ...form, priority: p.value })}
                    style={{
                      flex: 1,
                      background: form.priority === p.value ? 'rgba(0,200,120,0.12)' : 'rgba(10,22,40,0.5)',
                      border: `1px solid ${form.priority === p.value ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                      borderRadius: 8, padding: '8px 6px', cursor: 'pointer',
                      color: 'var(--nerixi-text)', fontSize: 11.5, fontWeight: 600,
                      display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    }}>
                    <span className={`prio-dot ${p.className}`} />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Échéance</label>
              <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} />
            </div>
          </div>

          <div style={{ marginBottom: 14 }}>
            <label>Client (optionnel)</label>
            <select value={form.clientId} onChange={e => setForm({ ...form, clientId: e.target.value })}>
              <option value="">— Aucun</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.entreprise}</option>)}
            </select>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Détails optionnels..." />
          </div>

          <button type="submit" className="btn-primary" disabled={saving} style={{ width: '100%' }}>
            {saving ? <><span className="spinner" /> &nbsp;Enregistrement…</> : (form.id ? 'Enregistrer' : 'Créer la tâche')}
          </button>
        </form>
      </div>
    </div>
  )
}

export function TaskList({ tasks, clients, onUpdate, onDelete, onCreate, showClient = true, allowAdd = true, defaultClientId = null, emptyText = 'Aucune tâche.' }) {
  const [editing, setEditing] = useState(null)

  const sorted = [...(tasks || [])].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    const pa = PRIO_ORDER[a.priority] ?? 1
    const pb = PRIO_ORDER[b.priority] ?? 1
    if (pa !== pb) return pa - pb
    if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate)
    if (a.dueDate) return -1
    if (b.dueDate) return 1
    return 0
  })

  const handleSave = async (form) => {
    if (form.id) await onUpdate(form.id, form)
    else await onCreate({ ...form, clientId: form.clientId ?? defaultClientId })
    setEditing(null)
  }

  return (
    <div>
      {allowAdd && (
        <button onClick={() => setEditing({ priority: 'med', clientId: defaultClientId, dueDate: new Date().toISOString().slice(0, 10) })}
          style={{
            width: '100%', marginBottom: 10,
            background: 'rgba(0,200,120,0.06)',
            border: '1px dashed var(--nerixi-border)',
            borderRadius: 10, padding: '10px 14px', color: 'var(--nerixi-accent)', fontSize: 12.5,
            fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease'
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--nerixi-green)'; e.currentTarget.style.background = 'rgba(0,200,120,0.12)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nerixi-border)'; e.currentTarget.style.background = 'rgba(0,200,120,0.06)' }}
        >+ Ajouter une tâche</button>
      )}
      {sorted.length === 0 ? (
        <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', textAlign: 'center', padding: '14px 0' }}>{emptyText}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(t => (
            <TaskRow
              key={t.id}
              task={t}
              client={clients?.find(c => c.id === t.clientId)}
              onToggle={(task) => onUpdate(task.id, { done: !task.done })}
              onDelete={onDelete}
              onEdit={setEditing}
              showClient={showClient}
            />
          ))}
        </div>
      )}
      {editing && (
        <TaskFormModal
          initial={editing}
          clients={clients || []}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  )
}

export function UrgentTasksPanel({ tasks, clients, onUpdate, onDelete, onSelectClient }) {
  const today = new Date().toISOString().slice(0, 10)
  const urgent = (tasks || [])
    .filter(t => !t.done && (t.priority === 'high' || (t.dueDate && t.dueDate <= today)))
    .sort((a, b) => {
      const ao = a.dueDate || '9999-99-99'
      const bo = b.dueDate || '9999-99-99'
      return ao.localeCompare(bo)
    })
    .slice(0, 6)

  return (
    <div className="card fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>🔥 Tâches urgentes</p>
        <span style={{ fontSize: 11, color: 'var(--nerixi-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '2px 9px', fontWeight: 600 }}>{urgent.length}</span>
      </div>
      {urgent.length === 0 ? (
        <p style={{ fontSize: 13, color: 'var(--nerixi-accent)' }}>✨ Tout est sous contrôle.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {urgent.map(t => {
            const client = clients?.find(c => c.id === t.clientId)
            const overdue = !t.done && isOverdue(t.dueDate)
            return (
              <div key={t.id}
                onClick={() => client && onSelectClient?.(client)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8,
                  background: 'rgba(10,22,40,0.5)',
                  border: `1px solid ${overdue ? 'rgba(226,75,74,0.3)' : 'var(--nerixi-border)'}`,
                  cursor: client ? 'pointer' : 'default',
                  transition: 'all 0.2s ease',
                }}
                onMouseEnter={e => { if (client) e.currentTarget.style.transform = 'translateX(2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)' }}
              >
                <button
                  className={`task-checkbox ${t.done ? 'is-done' : ''}`}
                  onClick={(e) => { e.stopPropagation(); onUpdate(t.id, { done: !t.done }) }}
                >{t.done ? '✓' : ''}</button>
                <span className={`prio-dot ${t.priority || 'med'}`} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.title}</p>
                  <p style={{ fontSize: 10.5, color: overdue ? '#ff8a89' : 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client?.entreprise || 'Tâche libre'}{t.dueDate ? ` · ${fmtDue(t.dueDate)}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 10, display: 'flex', alignItems: 'center', gap: 8 }}>
        Légende :
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="prio-dot high" /> Haute</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="prio-dot med" /> Moyenne</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span className="prio-dot low" /> Basse</span>
      </p>
    </div>
  )
}
