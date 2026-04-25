'use client'
import { useEffect, useMemo, useState } from 'react'
import { computeHealth, suggestAction } from '@/lib/health'
import { HealthGauge } from './HealthScore'

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

const TYPE_META = {
  client_created:        { icon: '🌟', label: 'Client créé',         className: 'type-status' },
  status_changed:        { icon: '🔄', label: 'Changement de statut', className: 'type-status' },
  onboarding_triggered:  { icon: '🚀', label: 'Onboarding lancé',    className: 'type-onboarding' },
  email_sent:            { icon: '📧', label: 'Email envoyé',        className: 'type-event' },
  event_scheduled:       { icon: '📅', label: 'RDV planifié',        className: 'type-event' },
  event_done:            { icon: '✅', label: 'Tâche terminée',      className: 'type-event-done' },
  stripe_succeeded:      { icon: '💳', label: 'Paiement reçu',       className: 'type-stripe' },
  stripe_failed:         { icon: '⚠️', label: 'Paiement échoué',     className: 'type-stripe-failed' },
  stripe_refunded:       { icon: '↩️', label: 'Remboursement',       className: 'type-stripe' },
  stripe_pending:        { icon: '⏳', label: 'Paiement en attente',  className: 'type-stripe' },
}

function formatMoney(cents) {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100)
  } catch { return `${((cents || 0) / 100).toFixed(2)}€` }
}

function buildItems(timeline, stripeCharges) {
  const items = [...(timeline || [])]
  stripeCharges.forEach(c => {
    items.push({
      id: c.id,
      ts: new Date(c.created * 1000).toISOString(),
      type: `stripe_${c.status}`,
      payload: { amount: c.amount, currency: c.currency, description: c.description, receipt_url: c.receipt_url },
    })
  })
  return items.sort((a, b) => b.ts.localeCompare(a.ts))
}

function groupByMonth(items) {
  const groups = []
  const map = {}
  items.forEach(it => {
    const d = new Date(it.ts)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!map[key]) {
      map[key] = { key, label: `${MONTHS_FR[d.getMonth()]} ${d.getFullYear()}`, items: [] }
      groups.push(map[key])
    }
    map[key].items.push(it)
  })
  return groups
}

function renderItem(it, client) {
  const meta = TYPE_META[it.type] || { icon: '•', label: it.type, className: '' }
  const date = new Date(it.ts)
  const time = date.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

  let body = null
  if (it.type === 'status_changed') {
    body = <span>De <strong style={{ color: 'var(--nerixi-text)' }}>{it.payload?.from}</strong> → <strong style={{ color: 'var(--nerixi-accent)' }}>{it.payload?.to}</strong></span>
  } else if (it.type === 'onboarding_triggered') {
    body = <span>Webhook n8n {it.payload?.status === 'failed' ? <span style={{ color: '#ff8a89' }}>échoué — {it.payload?.error}</span> : <span style={{ color: 'var(--nerixi-accent)' }}>déclenché ({it.payload?.triggeredBy || 'manual'})</span>}</span>
  } else if (it.type === 'event_scheduled' || it.type === 'event_done') {
    body = <span>{it.payload?.title}{it.payload?.notes ? ` · ${it.payload.notes}` : ''}</span>
  } else if (it.type === 'email_sent') {
    body = <span>{it.payload?.subject || it.payload?.to}</span>
  } else if (it.type === 'client_created') {
    body = <span>{client.entreprise} ajouté au CRM</span>
  } else if (it.type?.startsWith('stripe_')) {
    body = (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <span className="tl-item-amount">{formatMoney(it.payload?.amount)}</span>
        {it.payload?.description && <span style={{ fontSize: 12 }}>{it.payload.description}</span>}
        {it.payload?.receipt_url && <a href={it.payload.receipt_url} target="_blank" style={{ fontSize: 11.5, color: 'var(--nerixi-accent)' }}>Voir reçu →</a>}
      </div>
    )
  }

  return (
    <div key={it.id} className={`tl-item ${meta.className}`}>
      <div className="tl-item-head">
        <span className="tl-item-title">
          <span style={{ fontSize: 15 }}>{meta.icon}</span>
          {meta.label}
        </span>
        <span className="tl-item-time">{time}</span>
      </div>
      <div className="tl-item-body">{body}</div>
    </div>
  )
}

export default function ClientTimeline({ client, onClose, stripePayments = [], events = [] }) {
  const [data, setData] = useState({ loading: true, error: '', timeline: [] })

  useEffect(() => {
    if (!client) return
    let active = true
    fetch(`/api/timeline/${client.id}`, { cache: 'no-store' })
      .then(r => r.json())
      .then(d => { if (active) setData({ loading: false, error: d.error || '', timeline: d.timeline || [] }) })
      .catch(e => { if (active) setData({ loading: false, error: e.message, timeline: [] }) })
    return () => { active = false }
  }, [client])

  const stripeMatching = useMemo(() => {
    const email = (client?.email || '').toLowerCase().trim()
    if (!email) return []
    return stripePayments.filter(p => (p.customer_email || '').toLowerCase().trim() === email)
  }, [client, stripePayments])

  const items = useMemo(() => buildItems(data.timeline, stripeMatching), [data.timeline, stripeMatching])
  const groups = useMemo(() => groupByMonth(items), [items])

  const health = useMemo(() => client ? computeHealth(client, { stripePayments, events }) : null, [client, stripePayments, events])
  const action = useMemo(() => client && health ? suggestAction(client, health) : null, [client, health])

  if (!client) return null

  return (
    <div className="fullscreen-modal" onClick={onClose}>
      <div className="fullscreen-header" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0 }}>
          <button onClick={onClose}
            style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--nerixi-border)', color: 'var(--nerixi-text)', cursor: 'pointer', fontSize: 14 }}>
            ←
          </button>
          <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg, var(--nerixi-green), var(--nerixi-accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 800, color: '#06101f' }}>
            {client.entreprise?.charAt(0)}
          </div>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 700 }}>Timeline 360°</p>
            <p style={{ fontSize: 18, fontWeight: 800, marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.entreprise}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span className={`badge-${client.statut}`}>{client.statut}</span>
        </div>
      </div>

      <div className="fullscreen-modal-inner" onClick={e => e.stopPropagation()}>
        {health && (
          <div className="card fade-in-up" style={{ marginBottom: 22, display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
            <HealthGauge score={health.score} color={health.color} size={84} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>État du compte · {health.level}</p>
              <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                <span style={{ marginRight: 8 }}>{action?.icon}</span>{action?.text}
              </p>
              <div style={{ display: 'flex', gap: 14, marginTop: 10, flexWrap: 'wrap', fontSize: 12, color: 'var(--nerixi-muted)' }}>
                <span>📊 MRR : <strong style={{ color: 'var(--nerixi-text)' }}>{client.mrr || 0}€/mois</strong></span>
                <span>🏦 Installation : <strong style={{ color: 'var(--nerixi-text)' }}>{client.installation || 0}€</strong></span>
                <span>📈 Avancement : <strong style={{ color: 'var(--nerixi-text)' }}>{client.avancement || 0}%</strong></span>
                <span>🗓 Depuis : <strong style={{ color: 'var(--nerixi-text)' }}>{client.dateDebut}</strong></span>
              </div>
            </div>
          </div>
        )}

        {data.loading ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
            <span className="spinner" />
            <p style={{ marginTop: 10 }}>Chargement de la timeline…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
            <p style={{ fontSize: 32 }}>🎬</p>
            <p style={{ marginTop: 8 }}>Aucune activité enregistrée pour l'instant.</p>
          </div>
        ) : (
          <div className="timeline">
            {groups.map(g => (
              <div key={g.key}>
                <div className="tl-month">{g.label}</div>
                {g.items.map(it => renderItem(it, client))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
