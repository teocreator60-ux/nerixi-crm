'use client'

const MONTHS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

function formatMoney(cents) {
  try { return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format((cents || 0) / 100) }
  catch { return `${((cents || 0) / 100).toFixed(2)}€` }
}

function generateReportHTML({ year, month, clients, events, stripePayments }) {
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 1)

  const newClients = clients.filter(c => {
    if (!c.dateDebut) return false
    const d = new Date(c.dateDebut)
    return d >= monthStart && d < monthEnd
  })

  const monthEvents = events.filter(e => {
    if (!e.date) return false
    const d = new Date(e.date + 'T00:00:00')
    return d >= monthStart && d < monthEnd
  })
  const doneEvents = monthEvents.filter(e => e.done)

  const monthPayments = stripePayments.filter(p => {
    const d = new Date((p.created || 0) * 1000)
    return d >= monthStart && d < monthEnd
  })
  const succeeded = monthPayments.filter(p => p.status === 'succeeded')
  const totalReceived = succeeded.reduce((s, p) => s + (p.amount || 0), 0)

  const totalMRR = clients.filter(c => c.statut !== 'churné').reduce((s, c) => s + (Number(c.mrr) || 0), 0)
  const activeClients = clients.filter(c => c.statut === 'actif').length
  const enCours = clients.filter(c => c.statut === 'en-cours').length

  const topClients = [...clients]
    .filter(c => c.statut !== 'churné')
    .sort((a, b) => (b.mrr || 0) - (a.mrr || 0))
    .slice(0, 5)

  const today = new Date().toLocaleDateString('fr-FR', { dateStyle: 'long' })
  const monthLabel = `${MONTHS_FR[month]} ${year}`

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Rapport ${monthLabel} — Nerixi</title>
<style>
  @page { margin: 18mm 14mm; }
  body { font-family: -apple-system, 'Segoe UI', Inter, sans-serif; color: #111; line-height: 1.55; max-width: 900px; margin: 0 auto; padding: 32px; }
  h1 { color: #00c878; font-size: 30px; letter-spacing: -0.5px; margin-bottom: 4px; }
  h2 { color: #00c878; font-size: 17px; margin-top: 28px; margin-bottom: 10px; padding-bottom: 4px; border-bottom: 1px solid #e0e6ea; }
  .sub { color: #6b7d8a; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; margin-bottom: 24px; border-bottom: 2px solid #00c878; }
  .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 24px; }
  .stat { background: #f7faf9; border: 1px solid #e0e6ea; border-radius: 10px; padding: 14px; text-align: center; }
  .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7d8a; font-weight: 700; }
  .stat .value { font-size: 26px; font-weight: 800; color: #00c878; margin-top: 6px; }
  .stat .sub { color: #6b7d8a; font-size: 11px; margin-top: 4px; }
  table { border-collapse: collapse; width: 100%; font-size: 13px; }
  th, td { padding: 9px 11px; border-bottom: 1px solid #e0e6ea; text-align: left; }
  th { background: #f7faf9; color: #6b7d8a; text-transform: uppercase; letter-spacing: 1px; font-size: 11px; }
  ul { padding-left: 18px; }
  .footer { margin-top: 50px; padding-top: 18px; border-top: 1px solid #e0e6ea; color: #6b7d8a; font-size: 11px; text-align: center; }
  .actions { margin: 0 0 24px 0; padding: 14px; background: #fff7e0; border-radius: 8px; font-size: 12px; color: #555; }
  @media print { .actions { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="actions">
  <strong>📄 Rapport prêt à imprimer</strong> — Fichier → Imprimer → Enregistrer en PDF.
  Ne pas oublier d'activer "Graphismes d'arrière-plan" pour conserver les couleurs.
</div>

<div class="header">
  <div>
    <p class="sub">Rapport mensuel</p>
    <h1>${monthLabel}</h1>
  </div>
  <div style="text-align: right;">
    <p class="sub">Édité le</p>
    <p style="font-weight: 700;">${today}</p>
    <p class="sub" style="margin-top: 6px;">Nerixi · CRM</p>
  </div>
</div>

<h2>Synthèse du mois</h2>
<div class="stats">
  <div class="stat">
    <p class="label">MRR total</p>
    <p class="value">${totalMRR.toLocaleString('fr-FR')}€</p>
    <p class="sub">/ mois</p>
  </div>
  <div class="stat">
    <p class="label">Encaissé</p>
    <p class="value">${formatMoney(totalReceived)}</p>
    <p class="sub">${succeeded.length} paiement${succeeded.length > 1 ? 's' : ''}</p>
  </div>
  <div class="stat">
    <p class="label">Nouveaux clients</p>
    <p class="value">${newClients.length}</p>
    <p class="sub">${activeClients} actifs · ${enCours} en cours</p>
  </div>
</div>

${newClients.length > 0 ? `
<h2>Nouveaux clients du mois</h2>
<table>
  <thead><tr><th>Entreprise</th><th>Contact</th><th>Secteur</th><th style="text-align:right">MRR</th></tr></thead>
  <tbody>
    ${newClients.map(c => `<tr>
      <td><strong>${c.entreprise}</strong></td>
      <td>${c.nom || ''}</td>
      <td>${c.secteur || ''}</td>
      <td style="text-align:right; color: #00c878; font-weight: 700;">${(c.mrr || 0).toLocaleString('fr-FR')}€</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

${succeeded.length > 0 ? `
<h2>Paiements encaissés</h2>
<table>
  <thead><tr><th>Date</th><th>Client</th><th>Description</th><th style="text-align:right">Montant</th></tr></thead>
  <tbody>
    ${succeeded.slice(0, 20).map(p => `<tr>
      <td>${new Date(p.created * 1000).toLocaleDateString('fr-FR')}</td>
      <td>${p.customer_name || p.customer_email || '—'}</td>
      <td>${p.description || ''}</td>
      <td style="text-align:right; color: #00c878; font-weight: 700;">${formatMoney(p.amount, p.currency)}</td>
    </tr>`).join('')}
  </tbody>
</table>
` : ''}

<h2>Top 5 clients (MRR)</h2>
<table>
  <thead><tr><th>Entreprise</th><th>Statut</th><th>Avancement</th><th style="text-align:right">MRR</th></tr></thead>
  <tbody>
    ${topClients.map(c => `<tr>
      <td><strong>${c.entreprise}</strong></td>
      <td>${c.statut}</td>
      <td>${c.avancement || 0}%</td>
      <td style="text-align:right; color: #00c878; font-weight: 700;">${(c.mrr || 0).toLocaleString('fr-FR')}€</td>
    </tr>`).join('')}
  </tbody>
</table>

<h2>Activité du mois</h2>
<ul>
  <li><strong>${monthEvents.length}</strong> rendez-vous planifiés</li>
  <li><strong>${doneEvents.length}</strong> tâches terminées</li>
  <li><strong>${clients.filter(c => c.onboarding?.status === 'sent').length}</strong> onboardings n8n actifs au total</li>
</ul>

<div class="footer">
  <p><strong>NERIXI</strong> · Automatisation IA pour PME &amp; Grands Comptes</p>
  <p>nerixi.fr · info@nerixi.com</p>
</div>

</body>
</html>`
}

export default function generateMonthlyReport({ clients, events, stripePayments }) {
  const now = new Date()
  // Si on est avant le 5 du mois, on génère le rapport du mois précédent
  const isEarlyMonth = now.getDate() <= 5
  const reportDate = isEarlyMonth ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now
  const html = generateReportHTML({
    year: reportDate.getFullYear(),
    month: reportDate.getMonth(),
    clients: clients || [],
    events: events || [],
    stripePayments: stripePayments || [],
  })
  const w = window.open('', '_blank', 'width=1000,height=900')
  if (!w) {
    alert('Le navigateur a bloqué l\'ouverture du rapport. Autorise les popups pour ce site.')
    return
  }
  w.document.write(html)
  w.document.close()
}
