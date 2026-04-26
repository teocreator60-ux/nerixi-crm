const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000

export function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function buildMRRSeries(clients, months = 12) {
  const today = new Date()
  const series = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const mrr = clients
      .filter(c => c.dateDebut && new Date(c.dateDebut) <= d && c.statut !== 'churné')
      .reduce((sum, c) => sum + (Number(c.mrr) || 0), 0)
    series.push({ date: d, mrr, isProjection: false })
  }
  return series
}

// Projection : régression linéaire simple sur les 6 derniers points
export function buildForecast(clients, projectionMonths = 6) {
  const past = buildMRRSeries(clients, 6)
  const today = new Date()

  const n = past.length
  const xs = past.map((_, i) => i)
  const ys = past.map(p => p.mrr)
  const meanX = xs.reduce((a, b) => a + b, 0) / n
  const meanY = ys.reduce((a, b) => a + b, 0) / n
  const num = xs.reduce((sum, x, i) => sum + (x - meanX) * (ys[i] - meanY), 0)
  const den = xs.reduce((sum, x) => sum + (x - meanX) ** 2, 0) || 1
  const slope = num / den
  const intercept = meanY - slope * meanX

  // Variance pour bande de confiance
  const residuals = ys.map((y, i) => y - (slope * i + intercept))
  const variance = residuals.reduce((s, r) => s + r * r, 0) / Math.max(1, n - 2)
  const stderr = Math.sqrt(variance)

  const churnRate = computeChurnRate(clients) // 0..1 monthly

  const projection = []
  for (let i = 1; i <= projectionMonths; i++) {
    const x = n - 1 + i
    const linearMrr = Math.max(0, slope * x + intercept)
    // Apply observed churn decay to the existing base
    const decayedBase = past[past.length - 1].mrr * Math.pow(1 - churnRate, i)
    // Simple blend: lean toward decayed-then-trend
    const projected = Math.round(Math.max(0, decayedBase + Math.max(0, slope) * i))
    const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
    projection.push({
      date: d,
      mrr: projected,
      lower: Math.max(0, Math.round(projected - stderr * 1.5)),
      upper: Math.round(projected + stderr * 1.5),
      isProjection: true,
    })
  }

  return { past, projection, slope, churnRate, stderr }
}

export function computeChurnRate(clients) {
  // approximation : (churné count) / (total count active over avg lifespan)
  const churned = clients.filter(c => c.statut === 'churné').length
  const total = clients.length || 1
  // Average lifespan in months
  const lifespans = clients
    .filter(c => c.dateDebut)
    .map(c => Math.max(1, (Date.now() - new Date(c.dateDebut).getTime()) / MS_PER_MONTH))
  const avgLifespan = lifespans.length > 0
    ? lifespans.reduce((s, x) => s + x, 0) / lifespans.length
    : 12
  // monthly churn rate ~ churned / (total * avgLifespan)
  if (total === 0 || avgLifespan === 0) return 0
  return Math.min(0.5, churned / (total * Math.max(1, avgLifespan)))
}

export function computeLTV(client, churnRate) {
  const mrr = Number(client.mrr) || 0
  const installation = Number(client.installation) || 0
  if (!mrr) return installation
  // LTV = installation + MRR / churn_rate
  // Si churn_rate très bas, on cap à 60 mois
  const lifespanMonths = churnRate > 0.005 ? 1 / churnRate : 60
  return Math.round(installation + mrr * Math.min(60, lifespanMonths))
}

export function computeRevenue(client) {
  if (!client.dateDebut) return Number(client.installation) || 0
  const months = Math.max(0, (Date.now() - new Date(client.dateDebut).getTime()) / MS_PER_MONTH)
  return (Number(client.installation) || 0) + (Number(client.mrr) || 0) * months
}

// Cohort grid : rows = month of acquisition, cols = months since
export function buildCohorts(clients, monthsBack = 6) {
  const today = new Date()
  const cohorts = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthLabel = monthDate.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' })
    const cohortClients = clients.filter(c => {
      if (!c.dateDebut) return false
      const d = new Date(c.dateDebut)
      return d.getFullYear() === monthDate.getFullYear() && d.getMonth() === monthDate.getMonth()
    })
    const initialCount = cohortClients.length
    const initialMRR = cohortClients.reduce((s, c) => s + (Number(c.mrr) || 0), 0)
    const cells = []
    for (let j = 0; j <= i; j++) {
      // J months later → who's still active?
      const stillActive = cohortClients.filter(c => c.statut !== 'churné').length
      const stillMRR = cohortClients
        .filter(c => c.statut !== 'churné')
        .reduce((s, c) => s + (Number(c.mrr) || 0), 0)
      // Simple model : assume they're still there since we don't track exact churn dates
      // For older cohorts, decay slightly per month
      const retention = j === 0 ? 1 : (initialCount > 0 ? stillActive / initialCount : 0)
      cells.push({
        offset: j,
        retention,
        clients: stillActive,
        mrr: stillMRR,
      })
    }
    cohorts.push({
      monthDate, monthLabel,
      initialCount, initialMRR,
      cells,
    })
  }
  return cohorts
}
