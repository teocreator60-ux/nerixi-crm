'use client'
import { useEffect, useState } from 'react'
import { computeHealth, suggestAction } from '@/lib/health'

export function HealthGauge({ score, color, size = 90 }) {
  const [animated, setAnimated] = useState(0)
  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 50)
    return () => clearTimeout(t)
  }, [score])

  const R = 36
  const C = 2 * Math.PI * R
  const offset = C - (animated / 100) * C

  return (
    <div className="health-gauge" style={{ width: size, height: size }}>
      <svg viewBox="0 0 90 90">
        <circle cx="45" cy="45" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
        <circle
          cx="45" cy="45" r={R} fill="none"
          stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22, 1, 0.36, 1)', filter: `drop-shadow(0 0 6px ${color}88)` }}
        />
      </svg>
      <div className="label" style={{ color }}>
        {animated}<small>health</small>
      </div>
    </div>
  )
}

export function ClientHealthCard({ client, stripePayments, events }) {
  const health = computeHealth(client, { stripePayments, events })
  const action = suggestAction(client, health)

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 14, padding: 14 }}>
      <HealthGauge score={health.score} color={health.color} size={80} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Score santé · {health.level}</p>
        <p style={{ fontSize: 13.5, fontWeight: 600, marginTop: 4, color: 'var(--nerixi-text)' }}>
          <span style={{ marginRight: 6 }}>{action.icon}</span>{action.text}
        </p>
        <div className="health-bar" style={{ marginTop: 8 }}>
          <div style={{ width: `${health.score}%`, background: `linear-gradient(90deg, ${health.color}66, ${health.color})` }} />
        </div>
      </div>
    </div>
  )
}

export function AtRiskPanel({ clients, stripePayments, events, onSelect, limit = 5 }) {
  const enriched = clients
    .map(c => ({ client: c, ...computeHealth(c, { stripePayments, events }) }))
    .filter(x => x.level === 'risk' || x.level === 'warning')
    .sort((a, b) => a.score - b.score)
    .slice(0, limit)

  if (enriched.length === 0) {
    return (
      <div className="card fade-in-up">
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 10 }}>🩺 Santé du portefeuille</p>
        <p style={{ fontSize: 14, color: 'var(--nerixi-accent)', fontWeight: 600 }}>✨ Aucun client à risque — bravo !</p>
        <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>Tous tes clients ont un score &gt; 55.</p>
      </div>
    )
  }

  return (
    <div className="card fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>🩺 Clients à risque</p>
        <span style={{ fontSize: 11, color: 'var(--nerixi-muted)', background: 'rgba(255,255,255,0.05)', borderRadius: 999, padding: '2px 9px', fontWeight: 600 }}>{enriched.length}</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {enriched.map(({ client, score, color, level, signals }) => {
          const action = suggestAction(client, { score, color, level, signals })
          return (
            <div
              key={client.id}
              onClick={() => onSelect?.(client)}
              style={{
                display: 'flex', gap: 12, alignItems: 'center',
                padding: '10px 12px',
                background: 'rgba(10,22,40,0.6)',
                border: `1px solid ${color}33`,
                borderRadius: 10,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = color + '88'; e.currentTarget.style.transform = 'translateX(2px)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = color + '33'; e.currentTarget.style.transform = 'translateX(0)' }}
            >
              <HealthGauge score={score} color={color} size={52} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{client.entreprise}</p>
                <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {action.icon} {action.text}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
