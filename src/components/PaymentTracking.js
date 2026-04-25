'use client'
import { useMemo, useState } from 'react'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function fmtMonth(dateStr) {
  const d = new Date(dateStr)
  return `${MONTHS_FR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`
}

function clientStatus(client, payments) {
  const now = new Date()
  const start = new Date(client.dateDebut)
  if (start > now) return { code: 'upcoming', label: 'À venir' }

  const cliPays = payments.filter(p => p.clientId === client.id)
  if (cliPays.length === 0) return { code: 'unknown', label: 'Aucun historique' }

  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const thisMonthPay = cliPays.find(p => p.date.slice(0, 7) === thisMonth)

  if (thisMonthPay) {
    if (thisMonthPay.status === 'paid')    return { code: 'paid',    label: 'Payé ce mois' }
    if (thisMonthPay.status === 'pending') {
      const dueDay = Number(thisMonthPay.date.slice(8, 10))
      const today = now.getDate()
      if (today > dueDay + 5) return { code: 'late', label: `En retard de ${today - dueDay} j` }
      return { code: 'pending', label: 'En attente' }
    }
    if (thisMonthPay.status === 'late')    return { code: 'late', label: 'En retard' }
  }

  return { code: 'unknown', label: '—' }
}

const STATUS_STYLE = {
  paid:     { color: '#00e89a', bg: 'rgba(0,200,120,0.14)',  border: 'rgba(0,200,120,0.3)'  },
  pending:  { color: '#fac775', bg: 'rgba(250,199,117,0.14)', border: 'rgba(250,199,117,0.3)' },
  late:     { color: '#ff8a89', bg: 'rgba(226,75,74,0.14)',  border: 'rgba(226,75,74,0.3)'  },
  upcoming: { color: '#6cb6f5', bg: 'rgba(55,138,221,0.14)',  border: 'rgba(55,138,221,0.3)'  },
  unknown:  { color: '#7a9bb0', bg: 'rgba(255,255,255,0.05)', border: 'var(--nerixi-border)' },
}

export default function PaymentTracking({ clients, payments, onTogglePayment }) {
  const [filter, setFilter] = useState('all')

  const enriched = useMemo(() => clients.map(c => ({ ...c, _status: clientStatus(c, payments) })), [clients, payments])

  const filtered = filter === 'all' ? enriched : enriched.filter(c => c._status.code === filter)

  const counts = useMemo(() => {
    const out = { paid: 0, pending: 0, late: 0 }
    enriched.forEach(c => {
      if (out[c._status.code] !== undefined) out[c._status.code]++
    })
    return out
  }, [enriched])

  const totals = useMemo(() => {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    return payments.filter(p => p.date.slice(0, 7) === thisMonth).reduce((acc, p) => {
      acc.expected += p.amount
      if (p.status === 'paid') acc.received += p.amount
      else acc.outstanding += p.amount
      return acc
    }, { expected: 0, received: 0, outstanding: 0 })
  }, [payments])

  return (
    <div className="fade-in">
      <div style={{ marginBottom: 22 }}>
        <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>💰 Suivi des paiements</h1>
        <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
          Quels clients ont payé ce mois, lesquels sont en retard.
        </p>
      </div>

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
        <div className="card fade-in-up" style={{ borderColor: 'rgba(0,200,120,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Encaissé ce mois</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#00e89a', marginTop: 6 }}>{totals.received.toLocaleString('fr-FR')}€</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{counts.paid} client{counts.paid > 1 ? 's' : ''} à jour</p>
        </div>
        <div className="card fade-in-up" style={{ borderColor: 'rgba(250,199,117,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>À encaisser</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#fac775', marginTop: 6 }}>{totals.outstanding.toLocaleString('fr-FR')}€</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{counts.pending} en attente</p>
        </div>
        <div className="card fade-in-up" style={{ borderColor: 'rgba(226,75,74,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Retards</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#ff8a89', marginTop: 6 }}>{counts.late}</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{counts.late === 0 ? 'Tout est OK 🎉' : 'À relancer rapidement'}</p>
        </div>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 18, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
        {[
          { id: 'all',     label: 'Tous' },
          { id: 'paid',    label: 'Payés' },
          { id: 'pending', label: 'En attente' },
          { id: 'late',    label: 'En retard' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              border: 'none', borderRadius: 8,
              padding: '7px 16px',
              color: filter === f.id ? '#06101f' : 'var(--nerixi-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: 12.5,
              transition: 'all 0.2s ease'
            }}>
            {f.label}
          </button>
        ))}
      </div>

      <div className="card fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 30, textAlign: 'center', color: 'var(--nerixi-muted)' }}>Aucun client dans cette catégorie.</p>
        ) : (
          filtered.map((c, i) => {
            const s = STATUS_STYLE[c._status.code]
            const cliPays = payments
              .filter(p => p.clientId === c.id)
              .sort((a, b) => b.date.localeCompare(a.date))
              .slice(0, 6)
              .reverse()
            return (
              <div key={c.id} className="fade-in-up"
                style={{
                  padding: '16px 20px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--nerixi-border)',
                  display: 'grid',
                  gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr',
                  gap: 14,
                  alignItems: 'center',
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,200,120,0.25), rgba(54,230,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--nerixi-accent)', flexShrink: 0 }}>
                    {c.entreprise.charAt(0)}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.entreprise}</p>
                    <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.nom}</p>
                  </div>
                </div>

                <div className="table-mobile-hide" style={{ display: 'flex', gap: 4 }}>
                  {cliPays.map(p => {
                    const ps = STATUS_STYLE[p.status === 'paid' ? 'paid' : p.status === 'pending' ? 'pending' : 'late']
                    return (
                      <button
                        key={p.id}
                        onClick={() => onTogglePayment?.(p.id, p.status === 'paid' ? 'pending' : 'paid')}
                        title={`${fmtMonth(p.date)} — ${p.amount}€ — ${p.status}`}
                        style={{
                          width: 18, height: 22,
                          borderRadius: 4,
                          background: ps.bg,
                          border: `1px solid ${ps.border}`,
                          cursor: 'pointer',
                          padding: 0,
                          transition: 'transform 0.15s ease',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'scaleY(1.15)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scaleY(1)'}
                      />
                    )
                  })}
                </div>

                <p style={{ fontWeight: 700, color: 'var(--nerixi-accent)', fontSize: 14 }}>
                  {c.mrr}€<span style={{ color: 'var(--nerixi-muted)', fontWeight: 400, fontSize: 12 }}>/mois</span>
                </p>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: s.bg,
                  color: s.color,
                  border: `1px solid ${s.border}`,
                  borderRadius: 999,
                  padding: '5px 12px',
                  fontSize: 11.5,
                  fontWeight: 700,
                  justifySelf: 'end',
                  whiteSpace: 'nowrap',
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
                  {c._status.label}
                </span>
              </div>
            )
          })
        )}
      </div>

      <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 10, textAlign: 'center' }}>
        💡 Clique sur les pastilles pour basculer payé / en attente
      </p>
    </div>
  )
}
