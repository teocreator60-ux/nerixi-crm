'use client'
import { useEffect, useState } from 'react'
import Modal from './Modal'

function fmt(n) { return (Number(n) || 0).toLocaleString('fr-FR') }

const STATUS_LABELS = {
  draft: { label: 'Brouillon', color: '#6b7280' },
  sent: { label: 'Envoyé', color: '#3b82f6' },
  viewed: { label: 'Vu', color: '#8b5cf6' },
  signed: { label: 'Signé', color: '#10b981' },
  paid: { label: 'Payé', color: '#00c878' },
}

export default function Quotes({ clients = [], prospects = [] }) {
  const [quotes, setQuotes] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)

  const reload = async () => {
    setLoading(true)
    try {
      const r = await fetch('/api/quotes').then(r => r.json())
      setQuotes(r.quotes || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const newQuote = () => setEditing({
    title: 'Devis Nerixi',
    recipientName: '', recipientEmail: '', company: '',
    items: [{ label: 'Setup automatisation IA', description: 'Conception + déploiement', quantity: 1, unitPrice: 1500 }],
    tvaRate: 20,
    installation: 0, monthly: 0,
    notes: 'Devis valable 30 jours. Acompte de 50% à la commande.',
    validUntil: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  })

  const editQuote = (q) => setEditing(JSON.parse(JSON.stringify(q)))

  const saveQuote = async () => {
    if (!editing.recipientName || !editing.recipientEmail) return alert('Nom et email destinataire requis')
    const url = editing.id ? `/api/quotes/${editing.id}` : '/api/quotes'
    const method = editing.id ? 'PUT' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    const data = await res.json()
    if (data.quote) setEditing(null)
    reload()
  }

  const sendQuote = async (q) => {
    if (q.status === 'draft' && !confirm(`Envoyer le devis ${q.quoteNumber} à ${q.recipientEmail} ?\n\nCela enverra un email avec un lien public + un Payment Link Stripe.`)) return
    const res = await fetch(`/api/quotes/${q.id}/send`, { method: 'POST' })
    const data = await res.json()
    if (data.error) return alert(data.error)
    reload()
    alert(`✅ Devis envoyé !\n\nLien public : ${data.publicUrl}`)
  }

  const removeQuote = async (id) => {
    if (!confirm('Supprimer ce devis ?')) return
    await fetch(`/api/quotes/${id}`, { method: 'DELETE' })
    reload()
  }

  const total = quotes.reduce((s, q) => s + (q.total || 0), 0)
  const signed = quotes.filter(q => q.signedAt).reduce((s, q) => s + (q.total || 0), 0)
  const paid = quotes.filter(q => q.paidAt).reduce((s, q) => s + (q.total || 0), 0)

  if (loading) return <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--nerixi-muted)' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>📄 Devis</h2>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>Génère, envoie, signe et encaisse en 1 clic.</p>
        </div>
        <button onClick={newQuote} className="btn-primary">+ Nouveau devis</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 12, marginBottom: 18 }}>
        <div className="card">
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Total émis</p>
          <p style={{ fontSize: 22, fontWeight: 700 }}>{fmt(total)} €</p>
        </div>
        <div className="card">
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Signés</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#10b981' }}>{fmt(signed)} €</p>
        </div>
        <div className="card">
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Payés</p>
          <p style={{ fontSize: 22, fontWeight: 700, color: '#00c878' }}>{fmt(paid)} €</p>
        </div>
      </div>

      {quotes.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📄</p>
          Aucun devis. Crée ton premier devis pour transformer un prospect en client en 1 clic.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--nerixi-surface)', textAlign: 'left' }}>
                <th style={{ padding: 12 }}>Numéro</th>
                <th style={{ padding: 12 }}>Destinataire</th>
                <th style={{ padding: 12 }}>Titre</th>
                <th style={{ padding: 12, textAlign: 'right' }}>Total TTC</th>
                <th style={{ padding: 12 }}>Statut</th>
                <th style={{ padding: 12 }}>Date</th>
                <th style={{ padding: 12 }}></th>
              </tr>
            </thead>
            <tbody>
              {quotes.map(q => {
                const sl = STATUS_LABELS[q.paidAt ? 'paid' : (q.signedAt ? 'signed' : (q.viewedAt ? 'viewed' : (q.sentAt ? 'sent' : 'draft')))]
                return (
                  <tr key={q.id} style={{ borderTop: '1px solid var(--nerixi-border)' }}>
                    <td style={{ padding: 12, fontFamily: 'monospace', fontSize: 12 }}>{q.quoteNumber}</td>
                    <td style={{ padding: 12 }}>{q.recipientName} <span style={{ color: 'var(--nerixi-muted)' }}>{q.company || q.recipientEmail}</span></td>
                    <td style={{ padding: 12 }}>{q.title}</td>
                    <td style={{ padding: 12, textAlign: 'right', fontWeight: 700 }}>{fmt(q.total)} €</td>
                    <td style={{ padding: 12 }}><span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, color: 'white', background: sl.color }}>{sl.label}</span></td>
                    <td style={{ padding: 12, color: 'var(--nerixi-muted)', fontSize: 12 }}>{new Date(q.createdAt).toLocaleDateString('fr-FR')}</td>
                    <td style={{ padding: 12, textAlign: 'right', whiteSpace: 'nowrap' }}>
                      <button onClick={() => editQuote(q)} style={{ padding: '4px 8px', fontSize: 11, marginRight: 4, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 6, cursor: 'pointer' }}>Éditer</button>
                      {q.status !== 'paid' && <button onClick={() => sendQuote(q)} className="btn-primary" style={{ padding: '4px 10px', fontSize: 11, marginRight: 4 }}>{q.sentAt ? 'Renvoyer' : 'Envoyer'}</button>}
                      <a href={`/quote/${q.token}`} target="_blank" rel="noreferrer" style={{ padding: '4px 8px', fontSize: 11, marginRight: 4, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 6, textDecoration: 'none', color: 'inherit' }}>Voir</a>
                      <button onClick={() => removeQuote(q.id)} style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }}>×</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)} contentStyle={{ maxWidth: 720, maxHeight: '90vh', overflow: 'auto' }}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{editing.id ? `Devis ${editing.quoteNumber}` : 'Nouveau devis'}</h3>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))', gap: 10, marginBottom: 12 }}>
            <select className="input" value={editing.clientId || ''} onChange={e => {
              const c = clients.find(cc => cc.id === Number(e.target.value))
              if (c) setEditing({ ...editing, clientId: c.id, prospectId: null, recipientName: c.nom, recipientEmail: c.email, company: c.entreprise })
              else setEditing({ ...editing, clientId: null })
            }}>
              <option value="">— Client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.entreprise} — {c.nom}</option>)}
            </select>
            <select className="input" value={editing.prospectId || ''} onChange={e => {
              const p = prospects.find(pp => pp.id === Number(e.target.value))
              if (p) setEditing({ ...editing, prospectId: p.id, clientId: null, recipientName: p.nom || p.contact, recipientEmail: p.email, company: p.entreprise })
              else setEditing({ ...editing, prospectId: null })
            }}>
              <option value="">— Prospect —</option>
              {prospects.map(p => <option key={p.id} value={p.id}>{p.entreprise || p.nom}</option>)}
            </select>
          </div>

          <input className="input" placeholder="Titre du devis" value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} style={{ marginBottom: 8 }} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 200px), 1fr))', gap: 8, marginBottom: 8 }}>
            <input className="input" placeholder="Nom destinataire" value={editing.recipientName} onChange={e => setEditing({ ...editing, recipientName: e.target.value })} />
            <input className="input" placeholder="Email destinataire" value={editing.recipientEmail} onChange={e => setEditing({ ...editing, recipientEmail: e.target.value })} />
            <input className="input" placeholder="Société" value={editing.company} onChange={e => setEditing({ ...editing, company: e.target.value })} />
          </div>

          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700, marginTop: 14, marginBottom: 6 }}>Lignes</p>
          {editing.items.map((it, i) => (
            <div key={i} className="card" style={{ padding: 10, background: 'var(--nerixi-surface)', marginBottom: 6 }}>
              <input className="input" placeholder="Libellé" value={it.label} onChange={e => {
                const items = [...editing.items]; items[i] = { ...it, label: e.target.value }
                setEditing({ ...editing, items })
              }} style={{ marginBottom: 6 }} />
              <input className="input" placeholder="Description (optionnel)" value={it.description} onChange={e => {
                const items = [...editing.items]; items[i] = { ...it, description: e.target.value }
                setEditing({ ...editing, items })
              }} style={{ marginBottom: 6 }} />
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input className="input" type="number" placeholder="Qté" value={it.quantity} onChange={e => {
                  const items = [...editing.items]; items[i] = { ...it, quantity: Number(e.target.value) }
                  setEditing({ ...editing, items })
                }} style={{ width: 80 }} />
                <span>×</span>
                <input className="input" type="number" placeholder="Prix unit." value={it.unitPrice} onChange={e => {
                  const items = [...editing.items]; items[i] = { ...it, unitPrice: Number(e.target.value) }
                  setEditing({ ...editing, items })
                }} style={{ width: 120 }} />
                <span>€</span>
                <span style={{ marginLeft: 'auto', fontWeight: 700 }}>= {fmt(it.quantity * it.unitPrice)} €</span>
                <button onClick={() => setEditing({ ...editing, items: editing.items.filter((_, j) => j !== i) })} style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }}>×</button>
              </div>
            </div>
          ))}
          <button onClick={() => setEditing({ ...editing, items: [...editing.items, { label: '', description: '', quantity: 1, unitPrice: 0 }] })} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>+ Ligne</button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))', gap: 8, marginTop: 14 }}>
            <label style={{ fontSize: 12 }}>TVA (%)
              <input className="input" type="number" value={editing.tvaRate} onChange={e => setEditing({ ...editing, tvaRate: Number(e.target.value) })} />
            </label>
            <label style={{ fontSize: 12 }}>Acompte (€)
              <input className="input" type="number" value={editing.installation} onChange={e => setEditing({ ...editing, installation: Number(e.target.value) })} />
            </label>
            <label style={{ fontSize: 12 }}>Mensualité (€/mois)
              <input className="input" type="number" value={editing.monthly} onChange={e => setEditing({ ...editing, monthly: Number(e.target.value) })} />
            </label>
            <label style={{ fontSize: 12 }}>Valable jusqu'au
              <input className="input" type="date" value={editing.validUntil || ''} onChange={e => setEditing({ ...editing, validUntil: e.target.value })} />
            </label>
          </div>

          <textarea className="input" rows={3} placeholder="Notes (conditions, mentions…)" value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })} style={{ marginTop: 12 }} />

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 14 }}>
            <button onClick={() => setEditing(null)} className="btn-secondary">Annuler</button>
            <button onClick={saveQuote} className="btn-primary">{editing.id ? 'Enregistrer' : 'Créer'}</button>
          </div>
        </Modal>
      )}
    </div>
  )
}
