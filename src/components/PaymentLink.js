'use client'
import { useState } from 'react'

function generateInvoiceHTML({ client, amount, description, invoiceNumber, paymentUrl }) {
  const today = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const due = new Date(Date.now() + 15 * 86400000).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })
  const tva = (amount * 0.20).toFixed(2)
  const ttc = (amount * 1.20).toFixed(2)
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><title>Facture ${invoiceNumber}</title>
<style>
@page { margin: 18mm; }
body { font-family: -apple-system, 'Segoe UI', Inter, sans-serif; color: #111; line-height: 1.5; max-width: 800px; margin: 0 auto; padding: 32px; }
h1 { color: #00c878; font-size: 36px; letter-spacing: -1px; margin: 0 0 4px; }
.sub { color: #6b7d8a; font-size: 12px; letter-spacing: 1.5px; text-transform: uppercase; font-weight: 700; }
.header { display: flex; justify-content: space-between; align-items: flex-end; padding-bottom: 18px; margin-bottom: 28px; border-bottom: 2px solid #00c878; }
.parties { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; margin-bottom: 32px; }
.party label { display: block; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #6b7d8a; font-weight: 700; margin-bottom: 4px; }
.invoice-box { background: #f7faf9; border: 1px solid #e0e6ea; border-radius: 12px; padding: 18px; margin-bottom: 24px; }
table { width: 100%; border-collapse: collapse; font-size: 13px; }
th, td { padding: 12px 14px; text-align: left; border-bottom: 1px solid #e0e6ea; }
th { background: #f7faf9; color: #6b7d8a; text-transform: uppercase; font-size: 10px; letter-spacing: 1px; }
.totals { margin-top: 18px; display: flex; flex-direction: column; align-items: flex-end; }
.totals-row { display: flex; justify-content: space-between; min-width: 280px; padding: 6px 0; font-size: 13px; }
.totals-row.total { font-size: 18px; font-weight: 800; color: #00c878; padding-top: 10px; border-top: 2px solid #00c878; margin-top: 6px; }
.cta { background: linear-gradient(120deg, #00c878, #00e89a); color: white; padding: 18px; border-radius: 12px; margin: 24px 0; text-align: center; }
.cta a { color: white; font-weight: 700; font-size: 15px; text-decoration: none; }
.footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e0e6ea; color: #6b7d8a; font-size: 11px; text-align: center; }
.actions { background: #fff7e0; padding: 14px; border-radius: 8px; margin-bottom: 24px; font-size: 12px; color: #555; }
@media print { .actions { display: none; } body { padding: 0; } }
</style></head>
<body>
<div class="actions">📄 Document prêt à imprimer — Fichier → Imprimer → Enregistrer en PDF.</div>
<div class="header">
  <div><p class="sub">Facture</p><h1>${invoiceNumber}</h1></div>
  <div style="text-align:right;"><p class="sub">Émise le</p><p style="font-weight:700;">${today}</p></div>
</div>
<div class="parties">
  <div class="party"><label>Émetteur</label>
    <p style="font-weight:700; font-size: 15px; margin: 2px 0;">Nerixi</p>
    <p style="margin: 2px 0;">Téo · Fondateur</p>
    <p style="color: #6b7d8a; margin: 2px 0;">info@nerixi.com · nerixi.fr</p>
  </div>
  <div class="party"><label>Destinataire</label>
    <p style="font-weight:700; font-size: 15px; margin: 2px 0;">${client.entreprise || ''}</p>
    <p style="margin: 2px 0;">${client.nom || ''}</p>
    <p style="color: #6b7d8a; margin: 2px 0;">${client.email || ''}</p>
  </div>
</div>
<table>
  <thead><tr><th>Description</th><th style="text-align:right;">Montant HT</th></tr></thead>
  <tbody>
    <tr><td><strong>${description}</strong></td>
        <td style="text-align:right; font-weight: 700;">${amount.toFixed(2)} €</td></tr>
  </tbody>
</table>
<div class="totals">
  <div class="totals-row"><span>Sous-total HT</span><span>${amount.toFixed(2)} €</span></div>
  <div class="totals-row"><span>TVA (20%)</span><span>${tva} €</span></div>
  <div class="totals-row total"><span>Total TTC</span><span>${ttc} €</span></div>
</div>
<div class="cta">
  <a href="${paymentUrl}" target="_blank">💳 Payer en ligne · ${ttc} € TTC</a>
</div>
<p style="font-size: 12px; color: #6b7d8a; margin-bottom: 4px;"><strong>Date d'échéance :</strong> ${due}</p>
<p style="font-size: 11px; color: #6b7d8a;">Paiement par carte bancaire via Stripe (lien ci-dessus). Aucun escompte pour paiement anticipé. Pénalités de retard : 3× le taux légal en cas de retard.</p>
<div class="footer"><p><strong>NERIXI</strong> · SIREN à compléter · TVA FR-XX-XXXXXXX · nerixi.fr · info@nerixi.com</p></div>
</body></html>`
}

export default function PaymentLinkButton({ client, onCreated }) {
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState(client?.mrr || 1500)
  const [description, setDescription] = useState(`Abonnement Nerixi · ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`)
  const [creating, setCreating] = useState(false)
  const [createdLink, setCreatedLink] = useState(null)
  const [error, setError] = useState('')
  const [emailSending, setEmailSending] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const create = async () => {
    if (!Number(amount) || Number(amount) <= 0) { setError('Montant invalide'); return }
    setError(''); setCreating(true)
    try {
      const res = await fetch('/api/stripe/payment-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, amount: Number(amount), description }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setCreatedLink(data.paymentLink)
      onCreated?.(data.paymentLink)
    } catch (e) {
      setError(e.message)
    }
    setCreating(false)
  }

  const openInvoicePDF = () => {
    if (!createdLink) return
    const html = generateInvoiceHTML({
      client, amount: Number(amount), description,
      invoiceNumber: createdLink.invoiceNumber,
      paymentUrl: createdLink.url,
    })
    const w = window.open('', '_blank', 'width=900,height=900')
    if (w) { w.document.write(html); w.document.close() }
  }

  const sendEmail = async () => {
    if (!createdLink || !client.email) return
    setEmailSending(true)
    try {
      const ttc = (Number(amount) * 1.20).toFixed(2)
      const html = `
<p>Bonjour ${client.nom?.split(' ')[0] || client.nom},</p>
<p>Voici votre facture <strong>${createdLink.invoiceNumber}</strong> pour : <strong>${description}</strong>.</p>
<p>Montant total : <strong>${ttc} € TTC</strong></p>
<p style="text-align:center; margin: 24px 0;"><a href="${createdLink.url}" style="display:inline-block; background:linear-gradient(120deg,#00c878,#00e89a); color:white; padding:14px 32px; border-radius:8px; text-decoration:none; font-weight:700; font-size:15px;">💳 Payer en ligne · ${ttc} €</a></p>
<p>Le paiement est sécurisé via Stripe. Une confirmation vous sera envoyée automatiquement.</p>
<p>Pour toute question, n'hésitez pas à me répondre directement.</p>
<p>Cordialement,<br><strong>Téo</strong><br>Fondateur — Nerixi</p>`
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: client.email,
          toName: client.nom,
          subject: `Facture ${createdLink.invoiceNumber} · ${description}`,
          content: html,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setEmailSent(true)
        setTimeout(() => setEmailSent(false), 5000)
      } else {
        setError(data.error || 'Erreur envoi email')
      }
    } catch (e) { setError(e.message) }
    setEmailSending(false)
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="btn-primary" style={{ flex: 1, minWidth: 130 }}>
        💳 Demander un paiement
      </button>
    )
  }

  return (
    <div className="modal-backdrop" onClick={() => { setOpen(false); setCreatedLink(null) }} style={{ zIndex: 170 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 540 }}>
        <button onClick={() => { setOpen(false); setCreatedLink(null) }} className="modal-close">✕</button>

        {!createdLink ? (
          <>
            <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>💳 Nouveau paiement</p>
            <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginBottom: 18 }}>
              Crée un Stripe Payment Link et envoie la facture par email à {client.entreprise}.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label>Montant HT (€)</label>
                <input type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
              </div>
              <div>
                <label>TTC (TVA 20%)</label>
                <input type="text" value={`${(Number(amount) * 1.20).toFixed(2)} €`} disabled style={{ opacity: 0.7 }} />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label>Description</label>
              <input value={description} onChange={e => setDescription(e.target.value)} placeholder="Abonnement mensuel Nerixi..." />
            </div>

            {error && <p style={{ color: '#ff8a89', fontSize: 13, marginBottom: 10 }}>⚠ {error}</p>}

            <button onClick={create} disabled={creating} className="btn-primary" style={{ width: '100%' }}>
              {creating ? <><span className="spinner" /> &nbsp;Création du lien Stripe…</> : '✨ Créer le lien de paiement'}
            </button>
          </>
        ) : (
          <>
            <p style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>✅ Lien Stripe créé</p>
            <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginBottom: 18 }}>
              Facture <strong>{createdLink.invoiceNumber}</strong> · {(Number(amount) * 1.20).toFixed(2)} € TTC
            </p>

            <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 12, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
              <input value={createdLink.url} readOnly style={{ fontSize: 12, fontFamily: 'ui-monospace, Menlo, monospace' }} />
              <button onClick={() => navigator.clipboard.writeText(createdLink.url)} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 12 }}>📋 Copier</button>
            </div>

            {emailSent && <p style={{ color: 'var(--nerixi-accent)', fontSize: 13, marginBottom: 10 }}>✅ Email envoyé à {client.email}</p>}
            {error && <p style={{ color: '#ff8a89', fontSize: 13, marginBottom: 10 }}>⚠ {error}</p>}

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={openInvoicePDF} className="btn-secondary" style={{ flex: 1, minWidth: 140 }}>
                📄 Voir la facture PDF
              </button>
              <a href={createdLink.url} target="_blank" rel="noopener" className="btn-secondary" style={{ flex: 1, minWidth: 140, textAlign: 'center', textDecoration: 'none', padding: '11px 22px' }}>
                🔗 Ouvrir le lien
              </a>
              {client.email && (
                <button onClick={sendEmail} disabled={emailSending} className="btn-primary" style={{ flex: 2, minWidth: 200 }}>
                  {emailSending ? <><span className="spinner" /> &nbsp;Envoi…</> : `✉️ Envoyer la facture à ${client.email}`}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
