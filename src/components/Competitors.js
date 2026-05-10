'use client'
import { useEffect, useMemo, useState } from 'react'
import Modal from './Modal'

const THREAT_COLORS = {
  low: { bg: 'rgba(0,200,120,0.12)', border: '#00c878', label: 'Faible', color: '#00e89a' },
  medium: { bg: 'rgba(250,199,117,0.12)', border: '#fac775', label: 'Moyenne', color: '#fac775' },
  high: { bg: 'rgba(255,138,137,0.12)', border: '#ff8a89', label: 'Élevée', color: '#ff8a89' },
}

function fmt(n) { return Number(n) ? Number(n).toLocaleString('fr-FR') : '0' }
function timeAgo(ts) {
  if (!ts) return 'jamais'
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'à l\'instant'
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`
  return `il y a ${Math.floor(diff / 86400000)}j`
}

export default function Competitors({ myMRR = 0 }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [checking, setChecking] = useState(null)

  const reload = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/competitors').then(r => r.json())
      setItems(r.competitors || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const newItem = () => setEditing({
    name: '', url: '', region: 'Oise', estimatedMRR: 0, estimatedClients: 0,
    threatLevel: 'medium', notes: '', strengths: '', weaknesses: '',
  })
  const editItem = (c) => setEditing(JSON.parse(JSON.stringify(c)))

  const save = async () => {
    if (!editing.name) return alert('Nom requis')
    const url = editing.id ? `/api/competitors/${editing.id}` : '/api/competitors'
    const method = editing.id ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    setEditing(null)
    reload()
  }

  const remove = async (id) => {
    if (!confirm('Supprimer ce concurrent ?')) return
    await fetch(`/api/competitors/${id}`, { method: 'DELETE' })
    reload()
  }

  const check = async (c) => {
    if (!c.url) return alert('URL manquante')
    setChecking(c.id)
    try {
      const res = await fetch(`/api/competitors/${c.id}/check`, { method: 'POST' })
      const data = await res.json()
      if (data.error) alert(`❌ ${data.error}`)
      else if (data.hasChanges) alert(`🔔 Changements détectés sur ${c.name} !\n\n${data.changes.join('\n')}`)
      else alert(`✓ ${c.name} : aucun changement détecté`)
      reload()
    } finally { setChecking(null) }
  }

  const checkAll = async () => {
    if (!confirm(`Vérifier les ${items.length} concurrents maintenant ?`)) return
    for (const c of items) {
      if (c.url) {
        setChecking(c.id)
        try { await fetch(`/api/competitors/${c.id}/check`, { method: 'POST' }) } catch {}
      }
    }
    setChecking(null)
    reload()
  }

  const stats = useMemo(() => {
    const totalMRR = items.reduce((s, c) => s + (Number(c.estimatedMRR) || 0), 0)
    const ahead = items.filter(c => (Number(c.estimatedMRR) || 0) > myMRR).length
    const recentChanges = items.filter(c => {
      if (!c.lastChange?.detectedAt) return false
      return Date.now() - new Date(c.lastChange.detectedAt).getTime() < 30 * 86400000
    }).length
    return { totalMRR, ahead, recentChanges }
  }, [items, myMRR])

  if (loading) return <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--nerixi-muted)' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>🎯 Veille concurrents</h2>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            Track tes concurrents potentiels, leur MRR estimé, et reçois une alerte si leur site change.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {items.length > 0 && (
            <button onClick={checkAll} className="btn-secondary" disabled={!!checking}>
              🔄 Vérifier tous
            </button>
          )}
          <button onClick={newItem} className="btn-primary">+ Nouveau concurrent</button>
        </div>
      </div>

      {items.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginBottom: 18 }}>
          <div className="card">
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Concurrents trackés</p>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{items.length}</p>
          </div>
          <div className="card">
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>MRR cumulé estimé</p>
            <p style={{ fontSize: 22, fontWeight: 700 }}>{fmt(stats.totalMRR)}€</p>
          </div>
          <div className="card">
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Devant toi (MRR)</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: stats.ahead > 0 ? '#ff8a89' : '#00e89a' }}>{stats.ahead}</p>
          </div>
          <div className="card">
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Changements 30j</p>
            <p style={{ fontSize: 22, fontWeight: 700, color: '#fac775' }}>{stats.recentChanges}</p>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>🎯</p>
          Aucun concurrent. Ajoute ceux que tu veux surveiller dans l'Oise (ou ailleurs).
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
          {items.map(c => {
            const t = THREAT_COLORS[c.threatLevel] || THREAT_COLORS.medium
            const ahead = (Number(c.estimatedMRR) || 0) > myMRR
            return (
              <div key={c.id} className="card card-hover" style={{ borderLeft: `4px solid ${t.border}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 800, fontSize: 16 }}>{c.name}</p>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noreferrer" style={{ fontSize: 11.5, color: 'var(--nerixi-accent)', textDecoration: 'none' }}>
                        {c.url.replace(/^https?:\/\//, '').slice(0, 40)} ↗
                      </a>
                    )}
                  </div>
                  <span style={{ fontSize: 10.5, padding: '3px 8px', borderRadius: 999, background: t.bg, color: t.color, border: `1px solid ${t.border}`, fontWeight: 700 }}>
                    {t.label}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 12, marginTop: 10, marginBottom: 10 }}>
                  <div>
                    <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)' }}>MRR estimé</p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: ahead ? '#ff8a89' : 'var(--nerixi-text)' }}>{fmt(c.estimatedMRR)}€{ahead && ' ↑'}</p>
                  </div>
                  <div>
                    <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)' }}>Clients</p>
                    <p style={{ fontSize: 16, fontWeight: 700 }}>{c.estimatedClients || '?'}</p>
                  </div>
                </div>

                {c.lastChange && (
                  <div style={{ padding: 8, background: 'rgba(250,199,117,0.10)', border: '1px solid rgba(250,199,117,0.3)', borderRadius: 8, marginBottom: 10, fontSize: 11.5 }}>
                    <p style={{ color: '#fac775', fontWeight: 700, marginBottom: 4 }}>🔔 {timeAgo(c.lastChange.detectedAt)}</p>
                    {c.lastChange.changes?.slice(0, 2).map((ch, i) => (
                      <p key={i} style={{ color: 'var(--nerixi-muted)', fontSize: 11 }}>· {ch}</p>
                    ))}
                  </div>
                )}

                {c.notes && (
                  <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', fontStyle: 'italic', marginBottom: 10 }}>"{c.notes}"</p>
                )}

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <button onClick={() => check(c)} disabled={checking === c.id || !c.url} className="btn-primary" style={{ padding: '6px 12px', fontSize: 11.5 }}>
                    {checking === c.id ? '…' : '🔍 Vérifier'}
                  </button>
                  <button onClick={() => editItem(c)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 11.5 }}>Éditer</button>
                  <button onClick={() => remove(c.id)} style={{ padding: '6px 12px', fontSize: 11.5, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer' }}>×</button>
                </div>
                <p style={{ fontSize: 10, color: 'var(--nerixi-muted)', marginTop: 8, textAlign: 'right' }}>
                  Vérifié {timeAgo(c.lastChecked)}
                </p>
              </div>
            )
          })}
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} contentStyle={{ maxWidth: 560 }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{editing.id ? 'Éditer concurrent' : 'Nouveau concurrent'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input placeholder="Nom (ex: AutomatiPME)" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input placeholder="URL site (https://...)" value={editing.url} onChange={e => setEditing({ ...editing, url: e.target.value })} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
              <input placeholder="Région" value={editing.region} onChange={e => setEditing({ ...editing, region: e.target.value })} />
              <select value={editing.threatLevel} onChange={e => setEditing({ ...editing, threatLevel: e.target.value })}>
                <option value="low">⚪ Menace faible</option>
                <option value="medium">🟡 Menace moyenne</option>
                <option value="high">🔴 Menace élevée</option>
              </select>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
              <label style={{ fontSize: 12 }}>MRR estimé (€/mois)
                <input type="number" min="0" value={editing.estimatedMRR} onChange={e => setEditing({ ...editing, estimatedMRR: e.target.value })} />
              </label>
              <label style={{ fontSize: 12 }}>Clients estimés
                <input type="number" min="0" value={editing.estimatedClients} onChange={e => setEditing({ ...editing, estimatedClients: e.target.value })} />
              </label>
            </div>
            <textarea rows={2} placeholder="Forces (ce qu'ils font bien)" value={editing.strengths} onChange={e => setEditing({ ...editing, strengths: e.target.value })} />
            <textarea rows={2} placeholder="Faiblesses (où tu peux les battre)" value={editing.weaknesses} onChange={e => setEditing({ ...editing, weaknesses: e.target.value })} />
            <textarea rows={2} placeholder="Notes (positionnement, stratégie...)" value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setEditing(null)} className="btn-secondary">Annuler</button>
              <button onClick={save} className="btn-primary">{editing.id ? 'Enregistrer' : 'Créer'}</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
