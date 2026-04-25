const DAY = 24 * 60 * 60 * 1000

function monthKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export function computeHealth(client, { stripePayments = [], events = [] } = {}) {
  const now = new Date()
  const signals = {
    paidThisMonth: false,
    lateThisMonth: false,
    failedRecent: 0,
    noContactDays: null,
    lowAvancement: false,
    oldClient: false,
    churned: client.statut === 'churné' || client.statut === 'churn',
    upcoming: client.dateDebut ? new Date(client.dateDebut) > now : false,
  }

  let score = 50

  // Statut weight
  if (client.statut === 'actif')         score += 12
  else if (client.statut === 'en-cours') score += 5
  else if (client.statut === 'prospect') score -= 5
  else if (signals.churned)              score -= 30

  // Avancement
  const av = Number(client.avancement) || 0
  score += av * 0.18
  signals.lowAvancement = av < 30

  // Ancienneté (max +12)
  const start = client.dateDebut ? new Date(client.dateDebut) : null
  if (start) {
    const months = Math.max(0, (now - start) / (30 * DAY))
    signals.oldClient = months > 4
    score += Math.min(months / 6, 1) * 12
  }

  // Stripe payments matching
  const email = (client.email || '').toLowerCase().trim()
  const cliCharges = email
    ? stripePayments.filter(p => (p.customer_email || '').toLowerCase().trim() === email)
    : []
  const thisKey = monthKey(now)
  const paidNow = cliCharges.find(p => p.status === 'succeeded' && monthKey(new Date(p.created * 1000)) === thisKey)
  if (paidNow) {
    score += 22
    signals.paidThisMonth = true
  } else if (Number(client.mrr) > 0 && !signals.upcoming) {
    if (now.getDate() > 10) {
      score -= 22
      signals.lateThisMonth = true
    } else {
      score -= 5
    }
  }

  // Failed charges last 90d
  signals.failedRecent = cliCharges.filter(p => p.status === 'failed' && (now - p.created * 1000) < 90 * DAY).length
  score -= signals.failedRecent * 8

  // Recent contact via events
  const cliEvents = events.filter(e => e.clientId === client.id)
  if (cliEvents.length > 0) {
    const latest = cliEvents
      .map(e => new Date(`${e.date}T${e.time || '09:00'}:00`))
      .sort((a, b) => b - a)[0]
    const days = Math.floor((now - latest) / DAY)
    signals.noContactDays = days
    if (days <= 14)        score += 10
    else if (days <= 30)   score += 4
    else if (days <= 60)   score -= 5
    else                   score -= 12
  } else if (start && (now - start) > 30 * DAY) {
    signals.noContactDays = Math.floor((now - start) / DAY)
    score -= 8
  }

  if (signals.upcoming) score = 60

  score = Math.max(0, Math.min(100, Math.round(score)))

  let level, color
  if (signals.churned)       { level = 'churned'; color = '#b89cff' }
  else if (score >= 75)      { level = 'great';   color = '#00e89a' }
  else if (score >= 55)      { level = 'good';    color = '#36e6c4' }
  else if (score >= 35)      { level = 'warning'; color = '#fac775' }
  else                       { level = 'risk';    color = '#ff8a89' }

  return { score, level, color, signals }
}

export function suggestAction(client, health) {
  const s = health.signals
  if (s.upcoming) return { icon: '🌱', text: 'Démarrage à venir, prépare l\'onboarding' }
  if (health.level === 'churned') return { icon: '⚰️', text: 'Client churné — possible win-back ?' }
  if (s.failedRecent > 0) return { icon: '💳', text: `${s.failedRecent} paiement${s.failedRecent > 1 ? 's' : ''} échoué${s.failedRecent > 1 ? 's' : ''} — vérifier le moyen de paiement` }
  if (s.lateThisMonth) return { icon: '⚠️', text: 'Paiement du mois en retard — relancer aujourd\'hui' }
  if (s.noContactDays != null && s.noContactDays > 30) return { icon: '📞', text: `${s.noContactDays} jours sans contact — planifier un point` }
  if (s.lowAvancement && s.oldClient) return { icon: '🚀', text: 'Avancement faible malgré l\'ancienneté — accélérer le projet' }
  if (health.score >= 80) return { icon: '✨', text: 'Très bon client — opportunité d\'upsell ou de référence' }
  if (health.score >= 60) return { icon: '✓', text: 'Tout va bien' }
  return { icon: '📌', text: 'Surveille de près ce client' }
}
