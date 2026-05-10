'use client'
import { useEffect, useState } from 'react'

const ACTION_ICONS = {
  'login.success': '🔓',
  'login.failed': '⚠️',
  'logout': '🔒',
  'client.delete': '🗑',
  'client.update': '✏️',
  'client.create': '➕',
  'prospect.delete': '🗑',
  'quote.create': '📄',
  'quote.send': '📧',
  'payment.received': '💰',
  'quick_capture': '⚡',
}

const ACTION_LABELS = {
  'login.success': 'Connexion réussie',
  'login.failed': 'Connexion échouée',
  'logout': 'Déconnexion',
  'client.delete': 'Client supprimé',
  'client.update': 'Client modifié',
  'client.create': 'Client créé',
  'prospect.delete': 'Prospect supprimé',
  'quote.create': 'Devis créé',
  'quote.send': 'Devis envoyé',
  'payment.received': 'Paiement reçu',
  'quick_capture': 'Capture rapide',
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'à l\'instant'
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)}m`
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)}h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function AuditLogViewer() {
  const [log, setLog] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  const reload = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/audit?limit=200', { cache: 'no-store' })
      const data = await res.json()
      setLog(data.log || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const filtered = log.filter(e => {
    if (filter === 'all') return true
    if (filter === 'failures') return !e.success || e.action.includes('failed')
    if (filter === 'critical') return ['client.delete', 'prospect.delete', 'login.failed'].includes(e.action)
    return e.action.startsWith(filter)
  })

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>📜 Audit Log</h2>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            Toutes les actions enregistrées (qui, quand, quoi). Les 200 dernières.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: 'Tout' },
            { id: 'critical', label: '⚠ Critique' },
            { id: 'failures', label: '❌ Échecs' },
            { id: 'login', label: '🔓 Connexions' },
            { id: 'client', label: '👥 Clients' },
          ].map(f => (
            <button key={f.id} onClick={() => setFilter(f.id)} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              background: filter === f.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.6)',
              color: filter === f.id ? '#06101f' : 'var(--nerixi-muted)',
              border: '1px solid var(--nerixi-border)', borderRadius: 8, cursor: 'pointer'
            }}>{f.label}</button>
          ))}
          <button onClick={reload} style={{ padding: '6px 12px', fontSize: 12, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, color: 'var(--nerixi-muted)', cursor: 'pointer' }}>↻</button>
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--nerixi-muted)' }}>Chargement…</div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ padding: 36, textAlign: 'center', color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📭</p>
          Aucune action enregistrée pour ce filtre.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table style={{ width: '100%', minWidth: 540, borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--nerixi-surface)', textAlign: 'left' }}>
                <th style={{ padding: 10 }}>Action</th>
                <th style={{ padding: 10 }}>Acteur</th>
                <th style={{ padding: 10 }}>Cible</th>
                <th style={{ padding: 10 }}>IP</th>
                <th style={{ padding: 10 }}>Quand</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => (
                <tr key={e.id} style={{ borderTop: '1px solid var(--nerixi-border)', opacity: e.success ? 1 : 0.85 }}>
                  <td style={{ padding: 10 }}>
                    <span style={{ marginRight: 6 }}>{ACTION_ICONS[e.action] || '·'}</span>
                    <span style={{ fontWeight: 600, color: e.success ? 'var(--nerixi-text)' : '#ff8a89' }}>
                      {ACTION_LABELS[e.action] || e.action}
                    </span>
                  </td>
                  <td style={{ padding: 10, color: 'var(--nerixi-muted)' }}>{e.actor || '—'}</td>
                  <td style={{ padding: 10, color: 'var(--nerixi-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {e.target ? (e.target.entreprise || e.target.id || JSON.stringify(e.target).slice(0, 40)) : '—'}
                  </td>
                  <td style={{ padding: 10, color: 'var(--nerixi-muted)', fontFamily: 'monospace', fontSize: 11 }}>{e.ip || '—'}</td>
                  <td style={{ padding: 10, color: 'var(--nerixi-muted)', fontSize: 11.5, whiteSpace: 'nowrap' }}>{timeAgo(e.ts)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
