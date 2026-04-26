'use client'

export function SkelLine({ width = '100%', height = 12, style }) {
  return <span className="skel" style={{ width, height, display: 'inline-block', ...style }} />
}

export function SkelCircle({ size = 36, style }) {
  return <span className="skel" style={{ width: size, height: size, borderRadius: '50%', display: 'inline-block', ...style }} />
}

export function SkelClientCard() {
  return (
    <div className="skel-card">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <SkelCircle size={42} />
        <div style={{ flex: 1 }}>
          <SkelLine width="60%" height={14} style={{ marginBottom: 6 }} />
          <SkelLine width="40%" height={11} />
        </div>
        <SkelLine width={60} height={20} style={{ borderRadius: 999 }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        <SkelLine width="30%" height={11} />
        <SkelLine width="20%" height={13} />
      </div>
      <SkelLine width="100%" height={6} style={{ borderRadius: 999, marginTop: 4 }} />
    </div>
  )
}

export function SkelStatCard() {
  return (
    <div className="skel-card" style={{ minHeight: 110 }}>
      <SkelLine width="40%" height={11} />
      <SkelLine width="60%" height={26} style={{ marginTop: 4 }} />
      <SkelLine width="50%" height={10} style={{ marginTop: 6 }} />
    </div>
  )
}

export function SkelRow() {
  return (
    <div style={{ padding: '12px 14px', background: 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)', borderRadius: 10, display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6 }}>
      <SkelCircle size={28} />
      <div style={{ flex: 1 }}>
        <SkelLine width="55%" height={12} style={{ marginBottom: 5 }} />
        <SkelLine width="35%" height={10} />
      </div>
      <SkelLine width={48} height={14} />
    </div>
  )
}

export function SkelGrid({ count = 4, columns = 2 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, 1fr)`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => <SkelClientCard key={i} />)}
    </div>
  )
}

export function SkelStatsGrid({ count = 3 }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${count}, 1fr)`, gap: 16 }}>
      {Array.from({ length: count }).map((_, i) => <SkelStatCard key={i} />)}
    </div>
  )
}

export function SkelKanban() {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} style={{ background: 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)', borderRadius: 14, padding: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SkelLine width="50%" height={10} />
          {Array.from({ length: 2 + (i % 2) }).map((_, j) => (
            <div key={j} style={{ background: 'rgba(20,35,64,0.6)', borderRadius: 10, padding: 10 }}>
              <SkelLine width="70%" height={12} style={{ marginBottom: 6 }} />
              <SkelLine width="50%" height={10} />
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
