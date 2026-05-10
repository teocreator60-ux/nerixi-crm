'use client'
import { useEffect, useMemo, useState } from 'react'
import { comparePeriods, computeSalesVelocity, computeCAC, aggregateLossReasons } from '@/lib/analytics'

function fmt(n) { return Math.round(Number(n) || 0).toLocaleString('fr-FR') }
function fmtPct(n) {
  const v = Math.round((Number(n) || 0) * 10) / 10
  return `${v >= 0 ? '+' : ''}${v}%`
}
function deltaColor(v) { return (Number(v) || 0) >= 0 ? '#00e89a' : '#ff8a89' }

export default function AdvancedStats({ clients = [], prospects = [], config = {}, onConfigChange }) {
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft] = useState(String(config.monthlyGoal || 1500))
  const [editingSpend, setEditingSpend] = useState(false)
  const [spendDraft, setSpendDraft] = useState(String(config.monthlySpending || 0))
  const [comparePeriod, setComparePeriod] = useState('month') // 'month' | 'year'

  useEffect(() => { setGoalDraft(String(config.monthlyGoal || 1500)) }, [config.monthlyGoal])
  useEffect(() => { setSpendDraft(String(config.monthlySpending || 0)) }, [config.monthlySpending])

  const compare = useMemo(() => comparePeriods(clients), [clients])
  const velocity = useMemo(() => computeSalesVelocity(prospects, clients), [prospects, clients])
  const cac = useMemo(() => computeCAC(config.monthlySpending || 0, compare.newClients.cur), [config.monthlySpending, compare.newClients.cur])
  const loss = useMemo(() => aggregateLossReasons(prospects), [prospects])

  const goal = Number(config.monthlyGoal) || 1500
  const goalPct = Math.min(100, Math.round((compare.mrr.cur / goal) * 100))

  const saveConfig = async (patch) => {
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      const data = await res.json()
      if (data.config) onConfigChange?.(data.config)
    } catch {}
  }

  const saveGoal = async () => {
    const v = Number(goalDraft) || 0
    setEditingGoal(false)
    await saveConfig({ monthlyGoal: v })
  }
  const saveSpend = async () => {
    const v = Number(spendDraft) || 0
    setEditingSpend(false)
    await saveConfig({ monthlySpending: v })
  }

  const periodCompare = comparePeriod === 'month'
    ? { delta: compare.mrr.deltaMonth, pct: compare.mrr.pctMonth, label: 'vs mois dernier', prevValue: compare.mrr.prev }
    : { delta: compare.mrr.deltaYear, pct: compare.mrr.pctYear, label: 'vs année dernière', prevValue: compare.mrr.prevYear }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Objectif MRR */}
      <div className="card fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 10, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
            🎯 Objectif MRR mensuel
          </p>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {editingGoal ? (
              <>
                <input type="number" min="0" value={goalDraft} onChange={e => setGoalDraft(e.target.value)} style={{ width: 120, padding: '6px 10px', fontSize: 13 }} />
                <button onClick={saveGoal} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>OK</button>
                <button onClick={() => setEditingGoal(false)} style={{ padding: '6px 10px', fontSize: 12, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, color: 'var(--nerixi-muted)', cursor: 'pointer' }}>×</button>
              </>
            ) : (
              <button onClick={() => setEditingGoal(true)} style={{ padding: '4px 10px', fontSize: 11, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, color: 'var(--nerixi-muted)', cursor: 'pointer' }}>
                ✎ Modifier
              </button>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--nerixi-text)' }}>{fmt(compare.mrr.cur)}€</p>
          <p style={{ color: 'var(--nerixi-muted)', fontSize: 13 }}>/ {fmt(goal)}€</p>
          <p style={{ marginLeft: 'auto', fontSize: 16, fontWeight: 700, color: goalPct >= 100 ? '#00e89a' : 'var(--nerixi-accent)' }}>
            {goalPct >= 100 ? '🏆 Atteint !' : `${goalPct}%`}
          </p>
        </div>
        <div style={{ height: 12, background: 'rgba(0,200,120,0.12)', borderRadius: 999, overflow: 'hidden', position: 'relative' }}>
          <div style={{
            height: '100%',
            width: `${goalPct}%`,
            background: goalPct >= 100
              ? 'linear-gradient(90deg, #00e89a, #36e6c4, #fac775)'
              : 'linear-gradient(90deg, #00c878, #00e89a)',
            transition: 'width 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
            boxShadow: '0 0 16px rgba(0, 232, 154, 0.4)',
          }} />
        </div>
      </div>

      {/* Comparaison périodes */}
      <div className="card fade-in-up">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
            📈 Comparaison MRR
          </p>
          <div style={{ display: 'flex', gap: 4, background: 'rgba(10,22,40,0.6)', padding: 4, borderRadius: 10, border: '1px solid var(--nerixi-border)' }}>
            <button onClick={() => setComparePeriod('month')} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              background: comparePeriod === 'month' ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              color: comparePeriod === 'month' ? '#06101f' : 'var(--nerixi-muted)',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>vs mois dernier</button>
            <button onClick={() => setComparePeriod('year')} style={{
              padding: '6px 12px', fontSize: 12, fontWeight: 600,
              background: comparePeriod === 'year' ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              color: comparePeriod === 'year' ? '#06101f' : 'var(--nerixi-muted)',
              border: 'none', borderRadius: 6, cursor: 'pointer'
            }}>vs année dernière</button>
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 14 }}>
          <div>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 4 }}>Maintenant</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--nerixi-text)' }}>{fmt(compare.mrr.cur)}€</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 4 }}>{periodCompare.label}</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--nerixi-muted)' }}>{fmt(periodCompare.prevValue)}€</p>
          </div>
          <div>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 4 }}>Évolution</p>
            <p style={{ fontSize: 22, fontWeight: 800, color: deltaColor(periodCompare.delta) }}>
              {periodCompare.delta >= 0 ? '↑' : '↓'} {fmt(Math.abs(periodCompare.delta))}€
            </p>
            <p style={{ fontSize: 13, color: deltaColor(periodCompare.delta), fontWeight: 600 }}>{fmtPct(periodCompare.pct)}</p>
          </div>
        </div>
      </div>

      {/* CAC + Sales Velocity */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 14 }}>
        <div className="card fade-in-up">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
              💸 CAC ce mois
            </p>
            {editingSpend ? (
              <div style={{ display: 'flex', gap: 4 }}>
                <input type="number" min="0" placeholder="0" value={spendDraft} onChange={e => setSpendDraft(e.target.value)} style={{ width: 90, padding: '4px 8px', fontSize: 12 }} />
                <button onClick={saveSpend} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11 }}>OK</button>
              </div>
            ) : (
              <button onClick={() => setEditingSpend(true)} style={{ padding: '3px 8px', fontSize: 10.5, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 6, color: 'var(--nerixi-muted)', cursor: 'pointer' }}>
                💰 Dépenses
              </button>
            )}
          </div>
          <p style={{ fontSize: 26, fontWeight: 800, color: cac == null ? 'var(--nerixi-muted)' : 'var(--nerixi-text)' }}>
            {cac == null ? '—' : `${fmt(cac)}€`}
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            {compare.newClients.cur} client{compare.newClients.cur > 1 ? 's' : ''} acquis · dépense {fmt(config.monthlySpending || 0)}€
          </p>
        </div>

        <div className="card fade-in-up">
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>
            ⚡ Sales velocity
          </p>
          <p style={{ fontSize: 26, fontWeight: 800, color: 'var(--nerixi-text)' }}>
            {velocity.count > 0 ? `${velocity.avg}j` : '—'}
          </p>
          <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            {velocity.count > 0
              ? `prospect → client signé (sur ${velocity.count} deal${velocity.count > 1 ? 's' : ''})`
              : 'Pas encore assez de données'}
          </p>
        </div>
      </div>

      {/* Win/Loss */}
      {loss.total > 0 && (
        <div className="card fade-in-up">
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 12 }}>
            🏆 Win/Loss · {loss.total} prospect{loss.total > 1 ? 's' : ''} perdu{loss.total > 1 ? 's' : ''}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {loss.byReason.slice(0, 6).map(r => (
              <div key={r.reason} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12.5, minWidth: 0, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.reason}</span>
                <div style={{ flex: 2, height: 8, background: 'rgba(255,138,137,0.12)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${r.pct}%`, background: 'linear-gradient(90deg, #ff8a89, #fac775)' }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#ff8a89', minWidth: 50, textAlign: 'right' }}>{r.count} ({r.pct}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
