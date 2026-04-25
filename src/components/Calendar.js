'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']
const DAYS_FR   = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']

const TYPE_LABEL = {
  meeting:  'Rendez-vous',
  delivery: 'Livraison',
  demo:     'Démo',
  reminder: 'Rappel',
  payment:  'Paiement',
}

function fmtDate(d) {
  return d.toISOString().slice(0, 10)
}

function startOfWeek(d) {
  const day = (d.getDay() + 6) % 7 // monday = 0
  const out = new Date(d)
  out.setDate(d.getDate() - day)
  out.setHours(0, 0, 0, 0)
  return out
}

function buildGrid(viewDate) {
  const first = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const start = startOfWeek(first)
  const days = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    days.push(d)
  }
  return days
}

function notify(title, body) {
  if (typeof window === 'undefined') return
  if (!('Notification' in window)) return
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/favicon.ico' })
  }
}

export default function Calendar({ events, clients, onCreate, onUpdate, onDelete }) {
  const [view, setView] = useState(() => {
    const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
  })
  const [selectedDate, setSelectedDate] = useState(() => fmtDate(new Date()))
  const [editing, setEditing] = useState(null)
  const today = useMemo(() => fmtDate(new Date()), [])
  const days = useMemo(() => buildGrid(view), [view])
  const notifiedRef = useRef(new Set())

  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {})
    }
  }, [])

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const todayStr = fmtDate(now)
      events.forEach(ev => {
        if (ev.done || ev.date !== todayStr || notifiedRef.current.has(ev.id)) return
        const [h, m] = (ev.time || '09:00').split(':').map(Number)
        const evDate = new Date(now); evDate.setHours(h || 9, m || 0, 0, 0)
        const diff = evDate - now
        if (diff > 0 && diff < 60 * 1000) {
          notify(`Rappel · ${ev.title}`, ev.time + (ev.notes ? ' · ' + ev.notes : ''))
          notifiedRef.current.add(ev.id)
        }
      })
    }
    tick()
    const i = setInterval(tick, 30 * 1000)
    return () => clearInterval(i)
  }, [events])

  const eventsByDate = useMemo(() => {
    const map = {}
    events.forEach(e => {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    })
    Object.values(map).forEach(arr => arr.sort((a, b) => (a.time || '').localeCompare(b.time || '')))
    return map
  }, [events])

  const upcoming = useMemo(() => {
    const t = today
    return events
      .filter(e => e.date >= t && !e.done)
      .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
      .slice(0, 8)
  }, [events, today])

  const goPrev = () => { const d = new Date(view); d.setMonth(view.getMonth() - 1); setView(d) }
  const goNext = () => { const d = new Date(view); d.setMonth(view.getMonth() + 1); setView(d) }
  const goToday = () => { const d = new Date(); d.setDate(1); setView(d); setSelectedDate(fmtDate(new Date())) }

  const selectedEvents = eventsByDate[selectedDate] || []

  const startEdit = (date) => {
    setEditing({
      id: null,
      date,
      time: '09:00',
      title: '',
      type: 'reminder',
      clientId: '',
      notes: '',
      done: false,
    })
  }

  const saveEdit = async () => {
    if (!editing.title || !editing.date) return
    const payload = {
      date: editing.date,
      time: editing.time,
      title: editing.title,
      type: editing.type,
      clientId: editing.clientId ? Number(editing.clientId) : null,
      notes: editing.notes,
      done: editing.done,
    }
    if (editing.id) {
      await onUpdate(editing.id, payload)
    } else {
      await onCreate(payload)
    }
    setEditing(null)
  }

  const monthYear = `${MONTHS_FR[view.getMonth()]} ${view.getFullYear()}`

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>📅 Agenda</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            {events.filter(e => !e.done).length} rappels actifs · {events.filter(e => e.date === today && !e.done).length} aujourd'hui
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="cal-nav-btn" onClick={goPrev} aria-label="Précédent">‹</button>
          <button onClick={goToday} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>Aujourd'hui</button>
          <div style={{ minWidth: 170, textAlign: 'center', fontWeight: 700, fontSize: 16, textTransform: 'capitalize' }}>{monthYear}</div>
          <button className="cal-nav-btn" onClick={goNext} aria-label="Suivant">›</button>
          <button className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }} onClick={() => startEdit(selectedDate)}>+ Nouveau</button>
        </div>
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18 }}>
        <div className="card fade-in-up" style={{ padding: 18 }}>
          <div className="cal-head">
            {DAYS_FR.map(d => <div key={d}>{d}</div>)}
          </div>
          <div className="cal-grid">
            {days.map((d, i) => {
              const dStr = fmtDate(d)
              const isOther = d.getMonth() !== view.getMonth()
              const isToday = dStr === today
              const isSelected = dStr === selectedDate
              const dayEvents = eventsByDate[dStr] || []
              const visible = dayEvents.slice(0, 2)
              const more = dayEvents.length - visible.length
              return (
                <div
                  key={dStr + i}
                  className={`cal-day ${isOther ? 'is-other' : ''} ${isToday ? 'is-today' : ''} ${isSelected ? 'is-selected' : ''}`}
                  style={{ animationDelay: `${i * 0.012}s` }}
                  onClick={() => setSelectedDate(dStr)}
                  onDoubleClick={() => startEdit(dStr)}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="num">{d.getDate()}</span>
                    {dayEvents.length > 0 && (
                      <span className="cal-dot" />
                    )}
                  </div>
                  {visible.map(ev => (
                    <div key={ev.id} className={`cal-event type-${ev.type} ${ev.done ? 'is-done' : ''}`} title={`${ev.time} · ${ev.title}`}>
                      <strong style={{ marginRight: 4, fontSize: 9.5, opacity: 0.85 }}>{ev.time}</strong>{ev.title}
                    </div>
                  ))}
                  {more > 0 && <div className="cal-more">+{more} autre{more > 1 ? 's' : ''}</div>}
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: 14 }}>
                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <button onClick={() => startEdit(selectedDate)}
                style={{ background: 'rgba(0,200,120,0.12)', border: '1px solid var(--nerixi-border)', borderRadius: 8, color: 'var(--nerixi-accent)', cursor: 'pointer', padding: '4px 10px', fontSize: 12, fontWeight: 600 }}>
                + Ajouter
              </button>
            </div>

            {selectedEvents.length === 0 ? (
              <p style={{ color: 'var(--nerixi-muted)', fontSize: 13, padding: '12px 0' }}>Aucun événement ce jour-là.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {selectedEvents.map(ev => {
                  const cli = clients.find(c => c.id === ev.clientId)
                  return (
                    <div key={ev.id} className="fade-in-up"
                      style={{
                        background: 'rgba(10,22,40,0.6)',
                        border: '1px solid var(--nerixi-border)',
                        borderRadius: 10,
                        padding: '10px 12px',
                        display: 'flex',
                        gap: 10,
                        alignItems: 'flex-start',
                        opacity: ev.done ? 0.55 : 1,
                      }}>
                      <input
                        type="checkbox"
                        checked={!!ev.done}
                        onChange={e => onUpdate(ev.id, { ...ev, done: e.target.checked })}
                        style={{ width: 16, height: 16, marginTop: 4, cursor: 'pointer', accentColor: 'var(--nerixi-green)' }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          <strong style={{ fontSize: 13.5, textDecoration: ev.done ? 'line-through' : 'none' }}>{ev.title}</strong>
                          <span style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{TYPE_LABEL[ev.type] || ev.type}</span>
                        </div>
                        <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 2 }}>
                          {ev.time}{cli ? ` · ${cli.entreprise}` : ''}
                        </p>
                        {ev.notes && <p style={{ fontSize: 12, marginTop: 4 }}>{ev.notes}</p>}
                      </div>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setEditing({ ...ev, clientId: ev.clientId || '' })}
                          style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 6, padding: '3px 8px', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 11 }}>✎</button>
                        <button onClick={() => onDelete(ev.id)}
                          style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 6, padding: '3px 8px', color: '#ff8a89', cursor: 'pointer', fontSize: 11 }}>✕</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="card fade-in-up">
            <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>🔔 À venir</p>
            {upcoming.length === 0 ? (
              <p style={{ color: 'var(--nerixi-muted)', fontSize: 13 }}>Aucun rappel à venir.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {upcoming.map(ev => {
                  const cli = clients.find(c => c.id === ev.clientId)
                  const date = new Date(ev.date + 'T00:00:00')
                  return (
                    <div key={ev.id} onClick={() => { setSelectedDate(ev.date); setView(new Date(date.getFullYear(), date.getMonth(), 1)) }}
                      style={{
                        cursor: 'pointer',
                        display: 'flex', gap: 10, padding: '8px 10px',
                        background: 'rgba(10,22,40,0.5)', borderRadius: 8,
                        border: '1px solid var(--nerixi-border)',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--nerixi-green)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--nerixi-border)'}
                    >
                      <div style={{ width: 38, textAlign: 'center', flexShrink: 0 }}>
                        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--nerixi-accent)', lineHeight: 1 }}>{date.getDate()}</p>
                        <p style={{ fontSize: 9.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase' }}>{MONTHS_FR[date.getMonth()].slice(0, 3)}</p>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 12.5, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.title}</p>
                        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)' }}>{ev.time}{cli ? ' · ' + cli.entreprise : ''}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {editing && (
        <div className="modal-backdrop" onClick={() => setEditing(null)}>
          <div className="card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <button onClick={() => setEditing(null)} className="modal-close">✕</button>
            <p style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>{editing.id ? 'Modifier le rappel' : 'Nouveau rappel'}</p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label>Date</label>
                <input type="date" value={editing.date} onChange={e => setEditing({ ...editing, date: e.target.value })} />
              </div>
              <div>
                <label>Heure</label>
                <input type="time" value={editing.time} onChange={e => setEditing({ ...editing, time: e.target.value })} />
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Titre</label>
              <input value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Ex: Démo client" autoFocus />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label>Type</label>
                <select value={editing.type} onChange={e => setEditing({ ...editing, type: e.target.value })}>
                  <option value="reminder">Rappel</option>
                  <option value="meeting">Rendez-vous</option>
                  <option value="demo">Démo</option>
                  <option value="delivery">Livraison</option>
                  <option value="payment">Paiement</option>
                </select>
              </div>
              <div>
                <label>Client</label>
                <select value={editing.clientId || ''} onChange={e => setEditing({ ...editing, clientId: e.target.value })}>
                  <option value="">— Aucun</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.entreprise}</option>)}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Notes</label>
              <textarea rows={3} value={editing.notes || ''} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Détails du rappel..." />
            </div>

            <div style={{ display: 'flex', gap: 10 }}>
              {editing.id && (
                <button onClick={() => { onDelete(editing.id); setEditing(null) }}
                  style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', color: '#ff8a89', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Supprimer
                </button>
              )}
              <button className="btn-primary" onClick={saveEdit} style={{ flex: 1 }}>
                {editing.id ? 'Enregistrer' : 'Créer le rappel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
