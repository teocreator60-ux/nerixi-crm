'use client'
import { useMemo, useState } from 'react'

const MONTHS_FR_SHORT = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']

function formatMoney(v) {
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k€`
  return `${v}€`
}

export function MRRChart({ clients }) {
  const [hover, setHover] = useState(null)

  const series = useMemo(() => {
    const points = []
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const mrr = clients
        .filter(c => new Date(c.dateDebut) <= d)
        .reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)
      points.push({ month: d, mrr, label: `${MONTHS_FR_SHORT[d.getMonth()]} ${String(d.getFullYear()).slice(2)}` })
    }
    return points
  }, [clients])

  const W = 720, H = 240
  const PAD_L = 50, PAD_R = 24, PAD_T = 20, PAD_B = 36
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B

  const max = Math.max(1, ...series.map(p => p.mrr))
  const min = 0
  const niceMax = Math.ceil(max / 1000) * 1000 || 1000

  const x = (i) => PAD_L + (series.length === 1 ? innerW / 2 : (i * innerW) / (series.length - 1))
  const y = (v) => PAD_T + innerH - ((v - min) / (niceMax - min)) * innerH

  const linePath = series.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.mrr)}`).join(' ')
  const areaPath = `${linePath} L ${x(series.length - 1)} ${PAD_T + innerH} L ${x(0)} ${PAD_T + innerH} Z`

  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => niceMax * t)

  const last = series[series.length - 1]
  const prev = series[series.length - 2] || { mrr: last.mrr }
  const delta = last.mrr - prev.mrr
  const deltaPct = prev.mrr ? ((delta / prev.mrr) * 100) : 0

  return (
    <div className="card fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Évolution du MRR · 12 derniers mois</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--nerixi-text)', marginTop: 4, letterSpacing: -0.5 }}>
            {formatMoney(last.mrr)}<span style={{ fontSize: 14, color: 'var(--nerixi-muted)', marginLeft: 8, fontWeight: 500 }}>ce mois</span>
          </p>
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          background: delta >= 0 ? 'rgba(0,200,120,0.14)' : 'rgba(226,75,74,0.14)',
          border: `1px solid ${delta >= 0 ? 'rgba(0,200,120,0.3)' : 'rgba(226,75,74,0.3)'}`,
          color: delta >= 0 ? '#00e89a' : '#ff8a89',
          padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700,
          height: 'fit-content'
        }}>
          {delta >= 0 ? '↑' : '↓'} {formatMoney(Math.abs(delta))} ({deltaPct.toFixed(1)}%)
        </div>
      </div>

      <div style={{ position: 'relative' }}>
        <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id="chart-gradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%"   stopColor="#00e89a" stopOpacity="0.45" />
              <stop offset="60%"  stopColor="#00c878" stopOpacity="0.10" />
              <stop offset="100%" stopColor="#00c878" stopOpacity="0.00" />
            </linearGradient>
          </defs>

          {ticks.map((t, i) => (
            <g key={i}>
              <line className="chart-grid-line" x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} />
              <text className="chart-axis-label" x={PAD_L - 8} y={y(t) + 3} textAnchor="end">{formatMoney(t)}</text>
            </g>
          ))}

          {series.map((p, i) => (
            <text key={i} className="chart-axis-label" x={x(i)} y={H - 12} textAnchor="middle">
              {p.label.split(' ')[0]}
            </text>
          ))}

          <path d={areaPath} className="chart-area" />
          <path d={linePath} className="chart-line draw" />

          {series.map((p, i) => (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={x(i) - 22} y={PAD_T} width={44} height={innerH} fill="transparent" />
              <circle cx={x(i)} cy={y(p.mrr)} r={hover === i ? 6 : 4} className="chart-dot" style={{ animationDelay: `${1.0 + i * 0.04}s` }} />
            </g>
          ))}

          {hover !== null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={PAD_T + innerH} stroke="rgba(0,200,120,0.4)" strokeDasharray="3 3" />
              <g transform={`translate(${Math.min(W - 110, Math.max(PAD_L, x(hover) - 50))}, ${Math.max(PAD_T, y(series[hover].mrr) - 50)})`}>
                <rect x="0" y="0" width="100" height="40" rx="8" fill="#142340" stroke="rgba(0,200,120,0.4)" />
                <text x="10" y="16" fill="#7a9bb0" fontSize="10">{series[hover].label}</text>
                <text x="10" y="32" fill="#00e89a" fontSize="13" fontWeight="700">{formatMoney(series[hover].mrr)}</text>
              </g>
            </g>
          )}
        </svg>
      </div>
    </div>
  )
}

export function ClientGrowthChart({ clients }) {
  const data = useMemo(() => {
    const byMonth = {}
    const today = new Date()
    for (let i = 11; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      byMonth[key] = { date: d, count: 0, label: MONTHS_FR_SHORT[d.getMonth()] }
    }
    clients.forEach(c => {
      const d = new Date(c.dateDebut)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (byMonth[key]) byMonth[key].count++
    })
    return Object.values(byMonth)
  }, [clients])

  const W = 720, H = 200
  const PAD_L = 40, PAD_R = 14, PAD_T = 14, PAD_B = 32
  const innerW = W - PAD_L - PAD_R
  const innerH = H - PAD_T - PAD_B
  const max = Math.max(1, ...data.map(d => d.count))
  const barW = (innerW / data.length) * 0.6
  const gap   = (innerW / data.length) * 0.4

  const total = clients.length

  return (
    <div className="card fade-in-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>Acquisitions clients · 12 derniers mois</p>
          <p style={{ fontSize: 28, fontWeight: 800, color: 'var(--nerixi-text)', marginTop: 4, letterSpacing: -0.5 }}>
            {total}<span style={{ fontSize: 14, color: 'var(--nerixi-muted)', marginLeft: 8, fontWeight: 500 }}>clients au total</span>
          </p>
        </div>
      </div>

      <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`}>
        <defs>
          <linearGradient id="bar-gradient" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%"   stopColor="#00e89a" stopOpacity="1" />
            <stop offset="100%" stopColor="#00c878" stopOpacity="0.5" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t, i) => (
          <line key={i} className="chart-grid-line"
            x1={PAD_L} x2={W - PAD_R}
            y1={PAD_T + innerH * (1 - t)} y2={PAD_T + innerH * (1 - t)} />
        ))}

        {data.map((d, i) => {
          const h = (d.count / max) * innerH
          const x = PAD_L + i * (barW + gap) + gap / 2
          return (
            <g key={i}>
              <rect
                className="chart-bar"
                x={x}
                y={PAD_T + innerH - h}
                width={barW}
                height={h}
                style={{ animationDelay: `${i * 0.05}s`, transformBox: 'fill-box' }}
              />
              <text className="chart-axis-label" x={x + barW / 2} y={H - 10} textAnchor="middle">{d.label}</text>
              {d.count > 0 && (
                <text x={x + barW / 2} y={PAD_T + innerH - h - 6} textAnchor="middle"
                  fill="#00e89a" fontSize="11" fontWeight="700"
                  style={{ opacity: 0, animation: `fadeIn 0.4s ease ${0.3 + i * 0.05}s forwards` }}>
                  {d.count}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function StatusBreakdown({ clients }) {
  const counts = useMemo(() => {
    const out = { actif: 0, 'en-cours': 0, prospect: 0 }
    clients.forEach(c => { out[c.statut] = (out[c.statut] || 0) + 1 })
    return out
  }, [clients])

  const total = clients.length || 1
  const segments = [
    { key: 'actif',     label: 'Actifs',    color: '#00e89a', value: counts.actif || 0 },
    { key: 'en-cours',  label: 'En cours',  color: '#fac775', value: counts['en-cours'] || 0 },
    { key: 'prospect',  label: 'Prospects', color: '#6cb6f5', value: counts.prospect || 0 },
  ]

  let cumul = 0
  const R = 64
  const C = 2 * Math.PI * R

  return (
    <div className="card fade-in-up">
      <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600, marginBottom: 14 }}>Répartition</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap' }}>
        <svg width="160" height="160" viewBox="0 0 160 160" style={{ flexShrink: 0 }}>
          <circle cx="80" cy="80" r={R} fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="14" />
          {segments.map((s, i) => {
            const frac = s.value / total
            const len = frac * C
            const dasharray = `${len} ${C - len}`
            const dashoffset = -cumul * C
            cumul += frac
            return (
              <circle key={s.key}
                cx="80" cy="80" r={R} fill="none"
                stroke={s.color} strokeWidth="14"
                strokeDasharray={dasharray}
                strokeDashoffset={dashoffset}
                strokeLinecap="round"
                transform="rotate(-90 80 80)"
                style={{ transition: 'stroke-dasharray 1s cubic-bezier(0.22, 1, 0.36, 1)', filter: `drop-shadow(0 0 6px ${s.color}55)` }}
              />
            )
          })}
          <text x="80" y="76" textAnchor="middle" fill="#e8f4f0" fontSize="22" fontWeight="800">{total}</text>
          <text x="80" y="94" textAnchor="middle" fill="#7a9bb0" fontSize="10" letterSpacing="1">CLIENTS</text>
        </svg>

        <div style={{ flex: 1, minWidth: 140, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {segments.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: s.color, boxShadow: `0 0 8px ${s.color}` }} />
              <span style={{ flex: 1 }}>{s.label}</span>
              <strong>{s.value}</strong>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
