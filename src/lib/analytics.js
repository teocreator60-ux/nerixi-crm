const MS_PER_MONTH = 30 * 24 * 60 * 60 * 1000

export function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function buildMRRSeries(clients, months = 12) {
  const today = new Date()
  const series = []
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0)
    const active = clients.filter(c => {
      if (!c.dateDebut) return false
      if (new Date(c.dateDebut) > monthEnd) return false
      if (c.statut === 'churné' && c.dateChurn && new Date(c.dateChurn) <= d) return false
      return c.statut !== 'churné' || !c.dateChurn
    })
    const contributors = active
      .map(c => ({ id: c.id, entreprise: c.entreprise, mrr: Number(c.mrr) || 0 }))
      .filter(c => c.mrr > 0)
      .sort((a, b) => b.mrr - a.mrr)
    const mrr = contributors.reduce((sum, c) => sum + c.mrr, 0)
    series.push({ date: d, mrr, contributors, isProjection: false })
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

// MRR pour un mois donné (date = 1er du mois)
function mrrAtMonth(clients, monthDate) {
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0)
  return clients
    .filter(c => c?.dateDebut && new Date(c.dateDebut) <= monthEnd && c.statut !== 'churné')
    .reduce((s, c) => s + (Number(c.mrr) || 0), 0)
}

// Compare le MRR du mois courant vs mois précédent et même mois N-1
export function comparePeriods(clients) {
  const today = new Date()
  const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1)
  const sameMonthLastYear = new Date(today.getFullYear() - 1, today.getMonth(), 1)
  const cur = mrrAtMonth(clients, thisMonth)
  const prev = mrrAtMonth(clients, lastMonth)
  const prevYear = mrrAtMonth(clients, sameMonthLastYear)
  const newClientsThisMonth = clients.filter(c => {
    if (!c?.dateDebut) return false
    const d = new Date(c.dateDebut)
    return d.getFullYear() === thisMonth.getFullYear() && d.getMonth() === thisMonth.getMonth()
  }).length
  const newClientsLastMonth = clients.filter(c => {
    if (!c?.dateDebut) return false
    const d = new Date(c.dateDebut)
    return d.getFullYear() === lastMonth.getFullYear() && d.getMonth() === lastMonth.getMonth()
  }).length
  return {
    mrr: { cur, prev, prevYear, deltaMonth: cur - prev, deltaYear: cur - prevYear,
           pctMonth: prev ? ((cur - prev) / prev) * 100 : 0,
           pctYear: prevYear ? ((cur - prevYear) / prevYear) * 100 : 0 },
    newClients: { cur: newClientsThisMonth, prev: newClientsLastMonth,
                  delta: newClientsThisMonth - newClientsLastMonth }
  }
}

// Sales velocity : durée moyenne entre création prospect et conversion en client signé
export function computeSalesVelocity(prospects = [], clients = []) {
  // Pour chaque client signé, on cherche le prospect d'origine via email/entreprise
  const days = []
  for (const c of clients) {
    if (!c?.dateDebut || c.statut === 'prospect') continue
    const startDate = new Date(c.dateDebut)
    if (isNaN(startDate.getTime())) continue
    // Cherche un prospect matché par email ou entreprise
    const matched = prospects.find(p => p && (
      (p.email && c.email && p.email.toLowerCase() === c.email.toLowerCase()) ||
      (p.entreprise && c.entreprise && p.entreprise.toLowerCase() === c.entreprise.toLowerCase())
    ))
    if (matched?.createdAt) {
      const created = new Date(matched.createdAt)
      if (!isNaN(created.getTime())) {
        const diff = Math.max(0, (startDate - created) / (1000 * 60 * 60 * 24))
        days.push(diff)
      }
    }
  }
  if (days.length === 0) return { avg: 0, count: 0, min: 0, max: 0 }
  const avg = days.reduce((a, b) => a + b, 0) / days.length
  return {
    avg: Math.round(avg),
    count: days.length,
    min: Math.round(Math.min(...days)),
    max: Math.round(Math.max(...days)),
  }
}

// Coût d'acquisition client : dépense / nb clients gagnés sur la période
export function computeCAC(monthlySpending, clientsAcquiredThisMonth) {
  const sp = Number(monthlySpending) || 0
  const n = Number(clientsAcquiredThisMonth) || 0
  if (n === 0) return null
  return Math.round(sp / n)
}

// Win/Loss : agrégation des raisons depuis les prospects perdus
export function aggregateLossReasons(prospects = []) {
  const reasons = {}
  let totalLost = 0
  for (const p of prospects) {
    if (p?.lost && p.lossReason) {
      const r = p.lossReason.trim() || 'Non renseignée'
      reasons[r] = (reasons[r] || 0) + 1
      totalLost++
    }
  }
  const sorted = Object.entries(reasons)
    .map(([reason, count]) => ({ reason, count, pct: totalLost ? Math.round((count / totalLost) * 100) : 0 }))
    .sort((a, b) => b.count - a.count)
  return { total: totalLost, byReason: sorted }
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
