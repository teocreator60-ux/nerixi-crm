'use client'
import { useEffect, useMemo, useState } from 'react'

function fmtTime(ts) {
  const d = new Date(ts)
  const today = new Date()
  if (d.toDateString() === today.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

function snippet(s, n = 100) {
  if (!s) return ''
  const clean = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return clean.length > n ? clean.slice(0, n) + '…' : clean
}

export default function Inbox({ clients = [], onCompose, onSelectClient }) {
  const [inbound, setInbound] = useState([])
  const [outbound, setOutbound] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all') // all | unread | unassigned | by_client
  const [selectedId, setSelectedId] = useState(null)
  const [assignTo, setAssignTo] = useState({})

  const refresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/inbox', { cache: 'no-store' })
      const data = await res.json()
      setInbound(data.inbound || [])
      setOutbound(data.outbound || [])
    } catch {}
    setLoading(false)
  }
  useEffect(() => { refresh() }, [])

  const filtered = useMemo(() => {
    if (filter === 'unread') return inbound.filter(e => !e.read)
    if (filter === 'unassigned') return inbound.filter(e => e.clientId == null)
    return inbound
  }, [inbound, filter])

  const selected = inbound.find(e => e.id === selectedId)
  const conversation = useMemo(() => {
    if (!selected) return []
    const peerEmail = selected.fromEmail.toLowerCase()
    const inb = inbound.filter(e => e.fromEmail?.toLowerCase() === peerEmail).map(e => ({ ...e, dir: 'in', ts: e.receivedAt }))
    const out = outbound.filter(e => e.toEmail?.toLowerCase() === peerEmail).map(e => ({ ...e, dir: 'out', ts: e.sentAt }))
    return [...inb, ...out].sort((a, b) => new Date(a.ts) - new Date(b.ts))
  }, [selected, inbound, outbound])

  const markRead = async (id, read = true) => {
    setInbound(prev => prev.map(e => e.id === id ? { ...e, read } : e))
    await fetch(`/api/inbox/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ read }) })
  }
  const assign = async (id, clientId) => {
    setInbound(prev => prev.map(e => e.id === id ? { ...e, clientId: clientId ? Number(clientId) : null } : e))
    await fetch(`/api/inbox/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ clientId: clientId ? Number(clientId) : null }) })
  }
  const remove = async (id) => {
    if (!confirm('Supprimer cet email de l\'inbox ?')) return
    await fetch(`/api/inbox/${id}`, { method: 'DELETE' })
    setInbound(prev => prev.filter(e => e.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  const unreadCount = inbound.filter(e => !e.read).length
  const unassignedCount = inbound.filter(e => e.clientId == null).length

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <p style={{ fontWeight: 800, fontSize: 17 }}>📥 Inbox unifiée</p>
          <p style={{ color: 'var(--nerixi-muted)', fontSize: 12.5, marginTop: 2 }}>
            {inbound.length} reçus · {unreadCount} non lus · {unassignedCount} non attribués · matching auto par email
          </p>
        </div>
        <button onClick={refresh} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }}>↻ Actualiser</button>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 16, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 4, flexWrap: 'wrap' }}>
        {[
          { id: 'all',        label: 'Tous',          count: inbound.length },
          { id: 'unread',     label: 'Non lus',       count: unreadCount },
          { id: 'unassigned', label: 'Non attribués', count: unassignedCount },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              border: 'none', borderRadius: 8, padding: '6px 14px',
              color: filter === f.id ? '#06101f' : 'var(--nerixi-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: 12.5, display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
            {f.label}
            <span style={{ background: filter === f.id ? 'rgba(6,16,31,0.25)' : 'rgba(255,255,255,0.06)', padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>{f.count}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 30 }}><span className="spinner" /></div>
      ) : inbound.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📥</p>
          <p style={{ fontWeight: 600 }}>Aucun email reçu pour l'instant.</p>
          <p style={{ fontSize: 12.5, marginTop: 8 }}>
            Configure le webhook Brevo Inbound Parsing → POST sur <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>/api/inbox/brevo-webhook</code> pour recevoir tes emails ici.
          </p>
        </div>
      ) : (
        <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 14, alignItems: 'flex-start' }}>
          {/* List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
            {filtered.length === 0 ? (
              <p style={{ padding: 30, textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 13 }}>Aucun email dans cette catégorie.</p>
            ) : filtered.map(e => {
              const client = clients.find(c => c.id === e.clientId)
              const isSelected = selectedId === e.id
              return (
                <div key={e.id}
                  onClick={() => { setSelectedId(e.id); if (!e.read) markRead(e.id, true) }}
                  style={{
                    padding: '10px 12px',
                    background: isSelected ? 'rgba(0,200,120,0.10)' : (e.read ? 'rgba(10,22,40,0.5)' : 'rgba(108,182,245,0.08)'),
                    border: `1px solid ${isSelected ? 'var(--nerixi-green)' : (e.read ? 'var(--nerixi-border)' : 'rgba(108,182,245,0.3)')}`,
                    borderRadius: 10, cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {!e.read && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#6cb6f5', boxShadow: '0 0 6px #6cb6f5', flexShrink: 0 }} />}
                    <p style={{ fontSize: 13, fontWeight: e.read ? 500 : 700, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {client ? client.entreprise : e.fromName || e.fromEmail}
                    </p>
                    <span style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', flexShrink: 0 }}>{fmtTime(e.receivedAt)}</span>
                  </div>
                  <p style={{ fontSize: 12, marginTop: 2, fontWeight: e.read ? 400 : 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.subject}</p>
                  <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{snippet(e.text || e.html, 70)}</p>
                  {e.clientId == null && (
                    <span style={{ fontSize: 10, color: '#fac775', background: 'rgba(250,199,117,0.1)', padding: '1px 7px', borderRadius: 999, marginTop: 4, display: 'inline-block' }}>
                      Non attribué
                    </span>
                  )}
                </div>
              )
            })}
          </div>

          {/* Conversation panel */}
          <div className="card" style={{ position: 'sticky', top: 16, alignSelf: 'flex-start', maxHeight: 'calc(100vh - 280px)', display: 'flex', flexDirection: 'column' }}>
            {!selected ? (
              <p style={{ textAlign: 'center', padding: 30, color: 'var(--nerixi-muted)', fontSize: 13 }}>← Sélectionne un email pour voir la conversation</p>
            ) : (
              <>
                <div style={{ paddingBottom: 12, borderBottom: '1px solid var(--nerixi-border)', marginBottom: 12 }}>
                  <p style={{ fontSize: 14, fontWeight: 700 }}>{selected.subject}</p>
                  <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 4 }}>
                    {selected.fromName ? `${selected.fromName} <${selected.fromEmail}>` : selected.fromEmail}
                  </p>
                  <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {selected.clientId ? (
                      <button onClick={() => onSelectClient?.(clients.find(c => c.id === selected.clientId))}
                        style={{ background: 'rgba(0,200,120,0.12)', border: '1px solid var(--nerixi-border)', borderRadius: 999, padding: '4px 10px', color: 'var(--nerixi-accent)', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                        🏢 {clients.find(c => c.id === selected.clientId)?.entreprise || 'Client'}
                      </button>
                    ) : (
                      <select onChange={e => assign(selected.id, e.target.value || null)} value="" style={{ width: 'auto', padding: '4px 8px', fontSize: 11 }}>
                        <option value="">+ Attribuer à un client</option>
                        {clients.map(c => <option key={c.id} value={c.id}>{c.entreprise}</option>)}
                      </select>
                    )}
                    <button onClick={() => onCompose?.({ to: selected.fromEmail, toName: selected.fromName, subject: `Re: ${selected.subject}` })}
                      className="btn-primary" style={{ padding: '5px 12px', fontSize: 11 }}>
                      ↩ Répondre
                    </button>
                    <button onClick={() => markRead(selected.id, !selected.read)}
                      style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '4px 10px', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 11 }}>
                      {selected.read ? '◯ Marquer non lu' : '✓ Marquer lu'}
                    </button>
                    <button onClick={() => remove(selected.id)}
                      style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '4px 10px', color: '#ff8a89', cursor: 'pointer', fontSize: 11 }}>
                      ✕ Supprimer
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12, overflowY: 'auto', paddingRight: 4 }}>
                  {conversation.length === 0 ? (
                    <p style={{ color: 'var(--nerixi-muted)', fontSize: 13 }}>Aucun message.</p>
                  ) : conversation.map(msg => (
                    <div key={msg.id} style={{ display: 'flex', flexDirection: 'column', alignItems: msg.dir === 'out' ? 'flex-end' : 'flex-start' }}>
                      <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginBottom: 4, padding: '0 6px' }}>
                        {msg.dir === 'out' ? '➡️ Envoyé' : '⬅️ Reçu'} · {new Date(msg.ts).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                      <div className={`bubble ${msg.dir === 'out' ? 'out' : 'in'}`}>
                        {msg.dir === 'out'
                          ? <div dangerouslySetInnerHTML={{ __html: msg.content || '' }} />
                          : (msg.text || snippet(msg.html, 600) || '(vide)')}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
