'use client'
import { useEffect, useMemo, useState } from 'react'

function fmtRelative(ts) {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60000) return 'à l\'instant'
  if (diff < 3600000) return `il y a ${Math.floor(diff / 60000)} min`
  if (diff < 86400000) return `il y a ${Math.floor(diff / 3600000)} h`
  return new Date(ts).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function isLive(ts) {
  return Date.now() - new Date(ts).getTime() < 5 * 60 * 1000
}

function shortUrl(u) {
  try {
    const url = new URL(u, 'https://x')
    return (url.pathname || '/') + (url.search || '')
  } catch { return u }
}

export default function VisitorPanel({ clients = [], onSelectClient }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [showSnippet, setShowSnippet] = useState(false)
  const [snippetCopied, setSnippetCopied] = useState(false)
  const [filter, setFilter] = useState('all') // all | identified | live

  const refresh = async () => {
    try {
      const res = await fetch('/api/track/visitors', { cache: 'no-store' })
      const data = await res.json()
      setSessions(data.sessions || [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => {
    refresh()
    const i = setInterval(refresh, 8000)
    return () => clearInterval(i)
  }, [])

  const filtered = useMemo(() => {
    if (filter === 'identified') return sessions.filter(s => s.clientId || s.identifiedEmail)
    if (filter === 'live') return sessions.filter(s => isLive(s.lastSeen))
    return sessions
  }, [sessions, filter])

  const liveCount = sessions.filter(s => isLive(s.lastSeen)).length
  const identifiedCount = sessions.filter(s => s.clientId || s.identifiedEmail).length

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const snippetUrl = `${baseUrl}/api/track/snippet`
  const snippetTag = `<script src="${snippetUrl}" async></script>`

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(snippetTag)
      setSnippetCopied(true)
      setTimeout(() => setSnippetCopied(false), 2000)
    } catch {}
  }

  return (
    <div className="card fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>📡 Visiteurs nerixi.fr</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            {liveCount > 0 && <span style={{ color: 'var(--nerixi-accent)', fontWeight: 700 }}>● {liveCount} en live</span>}
            {liveCount > 0 && ' · '}{identifiedCount} identifiés · {sessions.length} sessions
          </p>
        </div>
        <button onClick={() => setShowSnippet(s => !s)}
          style={{ background: 'rgba(0,200,120,0.10)', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '5px 10px', fontSize: 11, color: 'var(--nerixi-accent)', cursor: 'pointer', fontWeight: 600 }}>
          {showSnippet ? '▼ Masquer' : '🔌 Snippet à coller'}
        </button>
      </div>

      {showSnippet && (
        <div className="fade-in" style={{ marginBottom: 14, padding: 12, background: 'rgba(10,22,40,0.7)', border: '1px solid var(--nerixi-border)', borderRadius: 10 }}>
          <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginBottom: 8 }}>
            Colle ce script dans le <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3, fontSize: 11 }}>&lt;head&gt;</code> de toutes tes pages nerixi.fr :
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input value={snippetTag} readOnly
              style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11.5, padding: '8px 10px' }} />
            <button onClick={copySnippet} className="btn-primary" style={{ padding: '8px 14px', fontSize: 12 }}>
              {snippetCopied ? '✓ Copié' : '📋 Copier'}
            </button>
          </div>
          <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 8, lineHeight: 1.5 }}>
            💡 Ajoute <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 5px', borderRadius: 3, fontSize: 10.5 }}>?ncid=ID_CLIENT</code> aux liens dans tes emails Brevo pour identifier le visiteur en 1 clic. L'email du form de contact est aussi capté automatiquement.
          </p>
        </div>
      )}

      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 12, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: 3 }}>
        {[
          { id: 'all',        label: 'Tous',       count: sessions.length },
          { id: 'live',       label: 'En live',    count: liveCount },
          { id: 'identified', label: 'Identifiés', count: identifiedCount },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              border: 'none', borderRadius: 6, padding: '5px 11px',
              color: filter === f.id ? '#06101f' : 'var(--nerixi-muted)',
              cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
            }}>{f.label} <span style={{ opacity: 0.7 }}>({f.count})</span></button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 20, color: 'var(--nerixi-muted)' }}><span className="spinner" /></div>
      ) : sessions.length === 0 ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 12.5 }}>
          <p style={{ fontSize: 24, marginBottom: 6 }}>📡</p>
          Aucun visiteur encore. Colle le snippet sur nerixi.fr pour commencer le tracking.
        </div>
      ) : filtered.length === 0 ? (
        <p style={{ padding: 18, textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 12.5 }}>Aucun dans cette catégorie.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 380, overflowY: 'auto' }}>
          {filtered.map(s => {
            const client = s.clientId ? clients.find(c => c.id === s.clientId) : null
            const live = isLive(s.lastSeen)
            const lastUrl = s.urls[s.urls.length - 1]
            return (
              <div key={s.sid}
                onClick={() => client && onSelectClient?.(client)}
                style={{
                  display: 'flex', gap: 10, alignItems: 'center',
                  padding: '8px 10px', borderRadius: 8,
                  background: live ? 'rgba(0,200,120,0.06)' : 'rgba(10,22,40,0.5)',
                  border: `1px solid ${live ? 'rgba(0,200,120,0.3)' : 'var(--nerixi-border)'}`,
                  cursor: client ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={e => { if (client) e.currentTarget.style.transform = 'translateX(2px)' }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateX(0)' }}
              >
                <div style={{ flexShrink: 0 }}>
                  {live ? (
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#00e89a', boxShadow: '0 0 8px #00e89a', animation: 'pulseGlow 1.5s infinite' }} />
                  ) : (
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.15)' }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {client ? `🏢 ${client.entreprise}` : (s.identifiedEmail ? `✉️ ${s.identifiedEmail}` : `👤 Visiteur anonyme`)}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {lastUrl?.title ? lastUrl.title + ' · ' : ''}{shortUrl(lastUrl?.url || '')}
                  </p>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <p style={{ fontSize: 10.5, color: live ? 'var(--nerixi-accent)' : 'var(--nerixi-muted)', fontWeight: 700 }}>
                    {fmtRelative(s.lastSeen)}
                  </p>
                  <p style={{ fontSize: 10, color: 'var(--nerixi-muted)', marginTop: 1 }}>
                    {s.pageviews} page{s.pageviews > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
