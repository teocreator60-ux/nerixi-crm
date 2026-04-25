'use client'
import { useMemo, useState } from 'react'

const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
const LATE_THRESHOLD_DAY = 10

const STATUS_STYLE = {
  paid:     { color: '#00e89a', bg: 'rgba(0,200,120,0.14)',  border: 'rgba(0,200,120,0.3)'  },
  pending:  { color: '#fac775', bg: 'rgba(250,199,117,0.14)', border: 'rgba(250,199,117,0.3)' },
  late:     { color: '#ff8a89', bg: 'rgba(226,75,74,0.14)',  border: 'rgba(226,75,74,0.3)'  },
  upcoming: { color: '#6cb6f5', bg: 'rgba(55,138,221,0.14)',  border: 'rgba(55,138,221,0.3)'  },
  none:     { color: '#7a9bb0', bg: 'rgba(255,255,255,0.05)', border: 'var(--nerixi-border)' },
  unknown:  { color: '#7a9bb0', bg: 'rgba(255,255,255,0.05)', border: 'var(--nerixi-border)' },
}

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function chargeMonthKey(charge) {
  const d = new Date(charge.created * 1000)
  return monthKey(d)
}

function findCharges(client, stripePayments) {
  const email = (client.email || '').toLowerCase().trim()
  if (!email) return []
  return stripePayments.filter(p => (p.customer_email || '').toLowerCase().trim() === email)
}

function buildHistory(client, charges, monthsBack = 6) {
  const now = new Date()
  const buckets = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const k = monthKey(d)
    const start = client.dateDebut ? new Date(client.dateDebut) : null
    const beforeStart = start && d < new Date(start.getFullYear(), start.getMonth(), 1)
    const monthCharges = charges.filter(c => chargeMonthKey(c) === k)
    const succeeded = monthCharges.find(c => c.status === 'succeeded')
    const isCurrent = i === 0

    let status = 'none'
    if (beforeStart) status = 'none'
    else if (succeeded) status = 'paid'
    else if (isCurrent) {
      status = now.getDate() > LATE_THRESHOLD_DAY ? 'late' : 'pending'
    }
    else status = 'late'

    buckets.push({
      key: k,
      label: `${MONTHS_FR[d.getMonth()]} ${String(d.getFullYear()).slice(2)}`,
      charge: succeeded || monthCharges[0] || null,
      status,
      beforeStart,
      isCurrent,
    })
  }
  return buckets
}

function clientStatus(client, charges) {
  const now = new Date()
  if (!client.email) return { code: 'unknown', label: 'Pas d\'email' }
  if (!Number(client.mrr)) return { code: 'unknown', label: 'Sans MRR' }
  const start = client.dateDebut ? new Date(client.dateDebut) : null
  if (start && start > now) return { code: 'upcoming', label: 'À venir' }

  const thisKey = monthKey(now)
  const paid = charges.find(c => chargeMonthKey(c) === thisKey && c.status === 'succeeded')
  if (paid) return { code: 'paid', label: 'Payé ce mois' }

  const day = now.getDate()
  if (day > LATE_THRESHOLD_DAY) {
    const lateBy = day - LATE_THRESHOLD_DAY
    return { code: 'late', label: `En retard de ${lateBy} j` }
  }
  return { code: 'pending', label: 'En attente' }
}

function formatMoney(cents) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
  } catch { return `${((cents || 0) / 100).toFixed(2)}€` }
}

export default function PaymentTracking({ clients, stripePayments, stripeMode, onRefresh }) {
  const [filter, setFilter] = useState('all')

  const enriched = useMemo(() => clients.map(c => {
    const charges = findCharges(c, stripePayments)
    return { ...c, _charges: charges, _status: clientStatus(c, charges), _history: buildHistory(c, charges) }
  }), [clients, stripePayments])

  const filtered = filter === 'all' ? enriched : enriched.filter(c => c._status.code === filter)

  const counts = useMemo(() => {
    const out = { paid: 0, pending: 0, late: 0, upcoming: 0, unknown: 0 }
    enriched.forEach(c => { if (out[c._status.code] !== undefined) out[c._status.code]++ })
    return out
  }, [enriched])

  const totals = useMemo(() => {
    const now = new Date()
    const thisKey = monthKey(now)
    let received = 0
    let outstanding = 0
    enriched.forEach(c => {
      if (c._status.code === 'paid') {
        const charge = c._charges.find(p => chargeMonthKey(p) === thisKey && p.status === 'succeeded')
        received += charge?.amount || (Number(c.mrr) * 100)
      } else if (c._status.code === 'pending' || c._status.code === 'late') {
        outstanding += (Number(c.mrr) || 0) * 100
      }
    })
    return { received, outstanding }
  }, [enriched])

  const isDemo = stripeMode === 'demo'

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>💰 Suivi des paiements</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            Données <strong style={{ color: stripeMode === 'live' ? 'var(--nerixi-accent)' : '#fac775' }}>{stripeMode === 'live' ? 'Stripe en direct' : 'démo Stripe'}</strong> · matching par email client
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: stripeMode === 'live' ? 'rgba(0,200,120,0.14)' : 'rgba(250,199,117,0.14)',
            border: `1px solid ${stripeMode === 'live' ? 'rgba(0,200,120,0.3)' : 'rgba(250,199,117,0.3)'}`,
            color: stripeMode === 'live' ? '#00e89a' : '#fac775',
            padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
            {stripeMode === 'live' ? 'STRIPE LIVE' : 'STRIPE DÉMO'}
          </span>
          {onRefresh && <button onClick={onRefresh} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12 }}>↻ Sync</button>}
        </div>
      </div>

      {isDemo && (
        <div className="card fade-in-up" style={{ marginBottom: 18, background: 'linear-gradient(120deg, rgba(250,199,117,0.10), rgba(250,199,117,0.02))', borderColor: 'rgba(250,199,117,0.3)' }}>
          <p style={{ fontSize: 13, color: '#fde2b6' }}>
            ⚠ STRIPE_SECRET_KEY non détectée — données de démo affichées. Redémarre <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>npm run dev</code> après avoir mis ta clé dans <code style={{ background: 'rgba(0,0,0,0.3)', padding: '1px 6px', borderRadius: 4 }}>.env.local</code>.
          </p>
        </div>
      )}

      <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 22 }}>
        <div className="card fade-in-up" style={{ borderColor: 'rgba(0,200,120,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Encaissé ce mois</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#00e89a', marginTop: 6 }}>{formatMoney(totals.received)}</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{counts.paid} client{counts.paid > 1 ? 's' : ''} à jour</p>
        </div>
        <div className="card fade-in-up" style={{ borderColor: 'rgba(250,199,117,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>À encaisser</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#fac775', marginTop: 6 }}>{formatMoney(totals.outstanding)}</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{counts.pending + counts.late} en attente</p>
        </div>
        <div className="card fade-in-up" style={{ borderColor: 'rgba(226,75,74,0.3)' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Retards</p>
          <p style={{ fontSize: 26, fontWeight: 800, color: '#ff8a89', marginTop: 6 }}>{counts.late}</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{counts.late === 0 ? 'Tout est OK 🎉' : 'À relancer'}</p>
        </div>
      </div>

      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 18, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
        {[
          { id: 'all',     label: 'Tous',       count: enriched.length },
          { id: 'paid',    label: 'Payés',      count: counts.paid },
          { id: 'pending', label: 'En attente', count: counts.pending },
          { id: 'late',    label: 'En retard',  count: counts.late },
          { id: 'unknown', label: 'Sans suivi', count: counts.unknown },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              border: 'none', borderRadius: 8, padding: '7px 14px',
              color: filter === f.id ? '#06101f' : 'var(--nerixi-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: 12.5, transition: 'all 0.2s ease',
              display: 'inline-flex', alignItems: 'center', gap: 6
            }}>
            {f.label}
            <span style={{
              background: filter === f.id ? 'rgba(6,16,31,0.25)' : 'rgba(255,255,255,0.06)',
              padding: '1px 7px', borderRadius: 999, fontSize: 10.5, fontWeight: 700
            }}>{f.count}</span>
          </button>
        ))}
      </div>

      <div className="card fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 30, textAlign: 'center', color: 'var(--nerixi-muted)' }}>Aucun client dans cette catégorie.</p>
        ) : (
          filtered.map((c, i) => {
            const s = STATUS_STYLE[c._status.code] || STATUS_STYLE.unknown
            return (
              <div key={c.id} className="fade-in-up"
                style={{
                  padding: '16px 20px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--nerixi-border)',
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1fr 0.9fr 0.9fr',
                  gap: 14,
                  alignItems: 'center',
                  animationDelay: `${i * 0.04}s`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,200,120,0.25), rgba(54,230,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--nerixi-accent)', flexShrink: 0 }}>
                    {c.entreprise?.charAt(0) || '?'}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.entreprise}</p>
                    <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {c.email || <em style={{ color: '#fac775' }}>email manquant</em>}
                    </p>
                  </div>
                </div>

                <div className="table-mobile-hide" style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 28 }}>
                  {c._history.map(h => {
                    const hs = STATUS_STYLE[h.status] || STATUS_STYLE.none
                    const heightPct = h.status === 'paid' ? 100 : h.status === 'pending' ? 55 : h.status === 'late' ? 100 : 25
                    return (
                      <button
                        key={h.key}
                        onClick={() => h.charge?.receipt_url && window.open(h.charge.receipt_url, '_blank')}
                        title={`${h.label} — ${h.charge ? formatMoney(h.charge.amount) + ' · ' + h.charge.status : (h.beforeStart ? 'Avant début' : 'Aucun paiement')}`}
                        disabled={!h.charge?.receipt_url}
                        style={{
                          width: 14, height: `${heightPct}%`,
                          minHeight: 8,
                          borderRadius: 3,
                          background: hs.bg,
                          border: `1px solid ${hs.border}`,
                          cursor: h.charge?.receipt_url ? 'pointer' : 'default',
                          padding: 0,
                          transition: 'transform 0.15s ease',
                          opacity: h.beforeStart ? 0.3 : 1,
                        }}
                        onMouseEnter={e => h.charge?.receipt_url && (e.currentTarget.style.transform = 'scaleY(1.15)')}
                        onMouseLeave={e => e.currentTarget.style.transform = 'scaleY(1)'}
                      />
                    )
                  })}
                </div>

                <p style={{ fontWeight: 700, color: 'var(--nerixi-accent)', fontSize: 14 }}>
                  {c.mrr ? `${c.mrr}€` : <span style={{ color: 'var(--nerixi-muted)', fontWeight: 400 }}>—</span>}
                  {c.mrr ? <span style={{ color: 'var(--nerixi-muted)', fontWeight: 400, fontSize: 12 }}>/mois</span> : null}
                </p>

                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                  borderRadius: 999, padding: '5px 12px',
                  fontSize: 11.5, fontWeight: 700,
                  justifySelf: 'end', whiteSpace: 'nowrap',
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
        💡 Les barres = 6 derniers mois (vert = payé, jaune = en attente, rouge = manqué). Clique pour voir le reçu Stripe.
      </p>
    </div>
  )
}
