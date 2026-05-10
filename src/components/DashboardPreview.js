'use client'

// Dashboard "preview" affiché derrière le login.
// Les données sensibles (chiffres MRR, emails, courbe...) sont floutées.

const TABS = [
  { icon: '📊', label: 'Dashboard', active: true },
  { icon: '🎯', label: 'Pipeline' },
  { icon: '📥', label: 'Prospection' },
  { icon: '👥', label: 'Clients' },
  { icon: '📅', label: 'Agenda' },
  { icon: '💰', label: 'Suivi paiements' },
  { icon: '💳', label: 'Stripe' },
  { icon: '💬', label: 'Chat' },
  { icon: '📧', label: 'Emails' },
  { icon: '⏱', label: 'Séquences' },
  { icon: '📄', label: 'Devis' },
  { icon: '💼', label: 'LinkedIn' },
]

const STATS = [
  { label: 'MRR Total', value: '••••€', sub: 'Revenus récurrents/mois', icon: '💰', sensitive: true },
  { label: 'Trésorerie', value: '••••€', sub: 'Total installations', icon: '🏦', sensitive: true },
  { label: 'Clients actifs', value: '••', sub: '+ •• en cours', icon: '🚀', sensitive: true },
]

export default function DashboardPreview() {
  return (
    <div className="dashpv-shell" aria-hidden="true">
      <aside className="dashpv-sidebar">
        <div className="dashpv-logo">
          <div className="dashpv-logo-img" />
          <p className="dashpv-logo-sub">CRM DASHBOARD</p>
        </div>
        <nav className="dashpv-tabs">
          {TABS.map((t, i) => (
            <div key={i} className={`dashpv-tab ${t.active ? 'is-active' : ''}`}>
              <span style={{ fontSize: 16 }}>{t.icon}</span>
              <span>{t.label}</span>
            </div>
          ))}
        </nav>
        <div className="dashpv-user">
          <div className="dashpv-avatar">T</div>
          <div className="dashpv-user-info">
            <p className="dashpv-user-name">Téo</p>
            <p className="dashpv-user-email blur-strong">info@nerixi.com</p>
          </div>
        </div>
      </aside>

      <main className="dashpv-main">
        <div className="dashpv-header">
          <div>
            <h1 className="dashpv-h1">Tableau de bord</h1>
            <p className="dashpv-subtitle">Vue d'ensemble de ton activité Nerixi</p>
          </div>
          <div className="dashpv-actions">
            <span className="dashpv-pill">● LIVE</span>
            <span className="dashpv-btn">📊 Rapport mensuel</span>
            <span className="dashpv-btn dashpv-btn-primary">🎬 Rétrospective 2026</span>
          </div>
        </div>

        <div className="dashpv-stats">
          {STATS.map((s, i) => (
            <div key={i} className="dashpv-card">
              <div className="dashpv-card-head">
                <span style={{ fontSize: 18 }}>{s.icon}</span>
                <p className="dashpv-card-label">{s.label}</p>
              </div>
              <p className={`dashpv-card-value ${s.sensitive ? 'blur-strong' : ''}`}>{s.value}</p>
              <p className={`dashpv-card-sub ${s.sensitive ? 'blur-medium' : ''}`}>{s.sub}</p>
            </div>
          ))}
        </div>

        <div className="dashpv-chart-card">
          <p className="dashpv-card-label" style={{ marginBottom: 14 }}>Évolution du MRR · 12 derniers mois</p>
          <div className="dashpv-chart-wrap blur-strong">
            <svg viewBox="0 0 720 200" preserveAspectRatio="none" className="dashpv-chart-svg">
              <defs>
                <linearGradient id="dashpv-grad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#00e89a" stopOpacity="0.45" />
                  <stop offset="100%" stopColor="#00c878" stopOpacity="0" />
                </linearGradient>
              </defs>
              <path d="M 0 150 L 60 130 L 120 110 L 180 90 L 240 100 L 300 70 L 360 65 L 420 50 L 480 45 L 540 35 L 600 30 L 660 25 L 720 20 L 720 200 L 0 200 Z" fill="url(#dashpv-grad)" />
              <path d="M 0 150 L 60 130 L 120 110 L 180 90 L 240 100 L 300 70 L 360 65 L 420 50 L 480 45 L 540 35 L 600 30 L 660 25 L 720 20" stroke="#00c878" strokeWidth="3" fill="none" />
            </svg>
          </div>
        </div>

        <div className="dashpv-grid-2">
          <div className="dashpv-card">
            <p className="dashpv-card-label">📈 Forecast MRR</p>
            <p className="dashpv-card-value blur-strong">••••€</p>
            <div className="blur-strong" style={{ height: 80, background: 'linear-gradient(180deg, rgba(0,200,120,0.2), transparent)', borderRadius: 8, marginTop: 12 }} />
          </div>
          <div className="dashpv-card">
            <p className="dashpv-card-label">💎 LTV portefeuille</p>
            <p className="dashpv-card-value blur-strong">•••••€</p>
            <p className="dashpv-card-sub blur-medium">moyen : ••••€</p>
          </div>
        </div>
      </main>
    </div>
  )
}
