'use client'
import { useState } from 'react'

const DEFAULT_ITEMS = [
  { id: 'kickoff',    label: 'Premier appel de cadrage' },
  { id: 'contract',   label: 'Contrat envoyé' },
  { id: 'signed',     label: 'Contrat signé (Docuseal)' },
  { id: 'access',     label: 'Accès créés (outils, data)' },
  { id: 'training',   label: 'Formation équipe réalisée' },
  { id: 'production', label: 'Mise en production' },
  { id: 'review',     label: 'Revue J+30 planifiée' },
]

function generateContractHTML(client) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const auto = (client.automatisations || []).map(a => `<li>${a}</li>`).join('') || '<li>À définir lors du cadrage</li>'
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<title>Contrat — ${client.entreprise}</title>
<style>
  @page { margin: 24mm 18mm; }
  body { font-family: -apple-system, 'Segoe UI', Inter, sans-serif; color: #111; line-height: 1.55; max-width: 800px; margin: 0 auto; padding: 32px; }
  h1 { color: #00c878; font-size: 32px; letter-spacing: -0.5px; margin-bottom: 4px; }
  .sub { color: #6b7d8a; font-size: 13px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 600; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; margin-bottom: 28px; border-bottom: 2px solid #00c878; }
  h2 { color: #00c878; font-size: 18px; margin-top: 28px; margin-bottom: 8px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 28px; margin-bottom: 16px; }
  .grid p { margin: 0; }
  .grid label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7d8a; font-weight: 700; margin-bottom: 3px; }
  ul { padding-left: 18px; }
  .signature { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 48px; }
  .signature-box { border-top: 1px solid #ccc; padding-top: 8px; }
  .signature-box p { margin: 0; font-size: 12px; color: #6b7d8a; }
  .total { font-size: 24px; font-weight: 800; color: #00c878; }
  .small { font-size: 11px; color: #6b7d8a; }
  .actions { margin: 24px 0; padding: 14px; background: #f7f7f5; border-radius: 8px; font-size: 12px; }
  @media print { .actions { display: none; } body { padding: 0; } }
</style>
</head>
<body>
<div class="actions">
  <strong>📄 Document prêt à imprimer ou exporter en PDF</strong> — Fichier → Imprimer → Enregistrer en PDF.
  Cette barre n'apparaîtra pas dans le PDF.
</div>

<div class="header">
  <div>
    <p class="sub">Nerixi · Convention de service</p>
    <h1>NERIXI</h1>
  </div>
  <div style="text-align: right;">
    <p class="sub">Édité le</p>
    <p style="font-weight: 700;">${today}</p>
  </div>
</div>

<h2>Parties</h2>
<div class="grid">
  <div>
    <label>Prestataire</label>
    <p><strong>Nerixi</strong></p>
    <p>Téo · Fondateur</p>
    <p class="small">info@nerixi.com · nerixi.fr</p>
  </div>
  <div>
    <label>Client</label>
    <p><strong>${client.entreprise || ''}</strong></p>
    <p>${client.nom || ''}</p>
    <p class="small">${client.email || ''}${client.telephone ? ' · ' + client.telephone : ''}</p>
  </div>
</div>

<h2>Objet</h2>
<p>Le présent contrat a pour objet la mise en place d'automatisations IA dans l'entreprise <strong>${client.entreprise}</strong> (secteur ${client.secteur || '—'}).</p>

<h2>Périmètre des automatisations</h2>
<ul>${auto}</ul>

<h2>Conditions financières</h2>
<div class="grid">
  <div>
    <label>Frais d'installation</label>
    <p class="total">${(client.installation || 0).toLocaleString('fr-FR')} €</p>
    <p class="small">Payable à la signature</p>
  </div>
  <div>
    <label>Abonnement mensuel</label>
    <p class="total">${(client.mrr || 0).toLocaleString('fr-FR')} € / mois</p>
    <p class="small">Engagement 12 mois reconductible</p>
  </div>
</div>

<h2>Calendrier</h2>
<p>Démarrage prévu le <strong>${client.dateDebut || today}</strong>. Livraison initiale sous 3 à 4 semaines, puis maintenance et évolutions continues.</p>

<h2>Conditions générales</h2>
<p class="small">Les prestations sont fournies dans le respect du RGPD. Les données client restent leur propriété exclusive. Délai de paiement : 15 jours. En cas de retard, des intérêts de retard légaux s'appliquent.</p>

<div class="signature">
  <div class="signature-box">
    <p>Pour Nerixi</p>
    <p>Téo · Fondateur</p>
    <p style="margin-top: 30px;">Signature :</p>
  </div>
  <div class="signature-box">
    <p>Pour ${client.entreprise}</p>
    <p>${client.nom}</p>
    <p style="margin-top: 30px;">Signature :</p>
  </div>
</div>

</body>
</html>`
}

export default function OnboardingChecklist({ client, onUpdate }) {
  const [busy, setBusy] = useState(false)
  const items = client.onboardingChecklist && Array.isArray(client.onboardingChecklist) && client.onboardingChecklist.length
    ? client.onboardingChecklist
    : DEFAULT_ITEMS.map(i => ({ ...i, done: false }))

  const doneCount = items.filter(i => i.done).length
  const pct = Math.round((doneCount / items.length) * 100)

  const toggle = async (id) => {
    setBusy(true)
    const next = items.map(i => i.id === id ? { ...i, done: !i.done } : i)
    await onUpdate({ ...client, onboardingChecklist: next })
    setBusy(false)
  }

  const generateContract = () => {
    const html = generateContractHTML(client)
    const w = window.open('', '_blank', 'width=900,height=900')
    if (!w) return
    w.document.write(html)
    w.document.close()
  }

  const sendDocuseal = () => {
    const baseUrl = 'https://www.docuseal.co/'
    window.open(baseUrl, '_blank')
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8 }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>📋 Checklist onboarding</p>
        <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--nerixi-accent)' }}>{doneCount}/{items.length} · {pct}%</p>
      </div>

      <div className="progress-bar" style={{ marginBottom: 14 }}>
        <div style={{ width: `${pct}%` }} />
      </div>

      <div style={{ marginBottom: 14 }}>
        {items.map(it => (
          <label key={it.id} className={`checklist-item ${it.done ? 'is-done' : ''}`} style={{ cursor: 'pointer', textTransform: 'none', letterSpacing: 0 }}>
            <button
              type="button"
              className={`task-checkbox ${it.done ? 'is-done' : ''}`}
              onClick={() => toggle(it.id)}
              disabled={busy}
            >{it.done ? '✓' : ''}</button>
            <span className="checklist-label">{it.label}</span>
          </label>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={generateContract} className="btn-secondary" style={{ flex: 1, minWidth: 140, padding: '8px 14px', fontSize: 12.5 }}>
          📄 Générer contrat
        </button>
        <button onClick={sendDocuseal} className="btn-secondary" style={{ flex: 1, minWidth: 140, padding: '8px 14px', fontSize: 12.5 }}>
          ✍️ Envoyer via Docuseal
        </button>
      </div>
    </div>
  )
}
