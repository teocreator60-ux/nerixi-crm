'use client'
import { useEffect, useMemo, useState } from 'react'

export default function ListsManager({ clients = [], lists, onSaved, onDeleted }) {
  const [editing, setEditing] = useState(null)

  const startNew = () => setEditing({ name: '', clientIds: [] })
  const startEdit = (list) => setEditing({ ...list, clientIds: [...(list.clientIds || [])] })

  const remove = async (list) => {
    if (!confirm(`Supprimer la liste "${list.name}" ?`)) return
    await fetch(`/api/lists/${list.id}`, { method: 'DELETE' })
    onDeleted?.(list.id)
  }

  const save = async (list) => {
    const url = list.id ? `/api/lists/${list.id}` : '/api/lists'
    const method = list.id ? 'PUT' : 'POST'
    const res = await fetch(url, {
      method, headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(list),
    })
    const data = await res.json()
    if (data.list) onSaved?.(data.list)
    setEditing(null)
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
          📋 Mes listes ({lists.length})
        </p>
        <button onClick={startNew} className="btn-primary" style={{ padding: '7px 14px', fontSize: 12.5 }}>
          + Nouvelle liste
        </button>
      </div>

      {lists.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 28, color: 'var(--nerixi-muted)', fontSize: 13 }}>
          <p style={{ fontSize: 24, marginBottom: 6 }}>📋</p>
          Aucune liste. Crée une liste pour envoyer un email à plusieurs clients d'un coup.
        </div>
      ) : (
        <div className="grid-2 stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
          {lists.map(l => (
            <div key={l.id} className="card card-hover fade-in-up" onClick={() => startEdit(l)}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.name}</p>
                  <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>
                    {l.clientIds?.length || 0} client{(l.clientIds?.length || 0) > 1 ? 's' : ''}
                  </p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); remove(l) }}
                  style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 6, color: '#ff8a89', cursor: 'pointer', padding: '3px 7px', fontSize: 11 }}>✕</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}>
                {(l.clientIds || []).slice(0, 5).map(id => {
                  const c = clients.find(x => x.id === id)
                  if (!c) return null
                  return <span key={id} style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid var(--nerixi-border)', borderRadius: 999, padding: '1px 8px', fontSize: 10.5, color: 'var(--nerixi-text)' }}>{c.entreprise}</span>
                })}
                {(l.clientIds?.length || 0) > 5 && (
                  <span style={{ fontSize: 10.5, color: 'var(--nerixi-muted)' }}>+{l.clientIds.length - 5}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <ListEditor
          initial={editing}
          clients={clients}
          onClose={() => setEditing(null)}
          onSave={save}
        />
      )}
    </div>
  )
}

function ListEditor({ initial, clients, onClose, onSave }) {
  const [name, setName] = useState(initial.name || '')
  const [selected, setSelected] = useState(new Set(initial.clientIds || []))
  const [search, setSearch] = useState('')
  const [saving, setSaving] = useState(false)

  const filtered = useMemo(() => {
    if (!search.trim()) return clients
    const q = search.toLowerCase()
    return clients.filter(c =>
      (c.entreprise || '').toLowerCase().includes(q) ||
      (c.nom || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.secteur || '').toLowerCase().includes(q)
    )
  }, [clients, search])

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const submit = async () => {
    if (!name.trim()) return
    setSaving(true)
    await onSave({ ...initial, name: name.trim(), clientIds: Array.from(selected) })
    setSaving(false)
  }

  const selectAllVisible = () => {
    const next = new Set(selected)
    filtered.forEach(c => next.add(c.id))
    setSelected(next)
  }
  const clearAll = () => setSelected(new Set())

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 165 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <button onClick={onClose} className="modal-close">✕</button>

        <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>{initial.id ? 'Modifier la liste' : 'Nouvelle liste'}</p>
        <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginBottom: 16 }}>{selected.size} client{selected.size > 1 ? 's' : ''} sélectionné{selected.size > 1 ? 's' : ''}</p>

        <div style={{ marginBottom: 12 }}>
          <label>Nom de la liste</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: Clients actifs · Newsletter" autoFocus />
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Rechercher (nom, entreprise, secteur, email)…" style={{ flex: 1 }} />
          <button onClick={selectAllVisible} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>Tous</button>
          <button onClick={clearAll} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>Aucun</button>
        </div>

        <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 6, maxHeight: 360, overflowY: 'auto', marginBottom: 16 }}>
          {filtered.length === 0 ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 13 }}>Aucun client trouvé.</p>
          ) : filtered.map(c => {
            const checked = selected.has(c.id)
            return (
              <label key={c.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 10px', borderRadius: 8,
                  cursor: 'pointer',
                  background: checked ? 'rgba(0,200,120,0.10)' : 'transparent',
                  border: `1px solid ${checked ? 'rgba(0,200,120,0.3)' : 'transparent'}`,
                  marginBottom: 4,
                  textTransform: 'none', letterSpacing: 0,
                }}>
                <input type="checkbox" checked={checked} onChange={() => toggle(c.id)}
                  style={{ width: 16, height: 16, accentColor: 'var(--nerixi-green)', cursor: 'pointer' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600 }}>{c.entreprise} · <span style={{ fontWeight: 400, color: 'var(--nerixi-muted)' }}>{c.nom}</span></p>
                  <p style={{ fontSize: 11, color: 'var(--nerixi-muted)' }}>{c.email || <em style={{ color: '#fac775' }}>email manquant</em>}{c.secteur ? ` · ${c.secteur}` : ''}</p>
                </div>
              </label>
            )
          })}
        </div>

        <button onClick={submit} disabled={saving || !name.trim()} className="btn-primary" style={{ width: '100%' }}>
          {saving ? <><span className="spinner" /> &nbsp;Enregistrement…</> : (initial.id ? 'Enregistrer' : 'Créer la liste')}
        </button>
      </div>
    </div>
  )
}
