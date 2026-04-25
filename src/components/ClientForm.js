'use client'
import { useState } from 'react'

const SECTEURS = ['Commerce', 'Logistique', 'BTP', 'Immobilier', 'Transport', 'Industrie', 'Services', 'Tech', 'Santé', 'Éducation', 'Autre']
const STATUTS = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'en-cours', label: 'En cours' },
  { value: 'actif',    label: 'Actif' },
]

function emptyClient() {
  return {
    nom: '',
    entreprise: '',
    secteur: 'Commerce',
    email: '',
    telephone: '',
    statut: 'prospect',
    mrr: 0,
    installation: 0,
    dateDebut: new Date().toISOString().slice(0, 10),
    avancement: 0,
    notes: '',
    automatisations: [],
    prochainAction: '',
    linkedin: '',
    tags: [],
  }
}

export default function ClientForm({ client, onClose, onSaved, onDeleted }) {
  const [form, setForm] = useState(() => client ? {
    ...emptyClient(),
    ...client,
    automatisations: Array.isArray(client.automatisations) ? client.automatisations.join(', ') : '',
    tags: Array.isArray(client.tags) ? client.tags.join(', ') : '',
  } : { ...emptyClient(), automatisations: '', tags: '' })

  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [error, setError] = useState('')
  const isEdit = !!client?.id

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.nom || !form.entreprise) {
      setError('Nom et entreprise requis')
      return
    }
    setSaving(true)
    try {
      const payload = {
        ...form,
        mrr: Number(form.mrr) || 0,
        installation: Number(form.installation) || 0,
        avancement: Number(form.avancement) || 0,
        automatisations: String(form.automatisations || '').split(',').map(s => s.trim()).filter(Boolean),
        tags: String(form.tags || '').split(',').map(s => s.trim()).filter(Boolean),
      }
      const url = isEdit ? `/api/clients/${client.id}` : '/api/clients'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onSaved?.(data.client)
      onClose()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      const res = await fetch(`/api/clients/${client.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Suppression échouée')
      onDeleted?.(client.id)
      onClose()
    } catch (e) {
      setError(e.message)
    }
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 70 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 660 }}>
        <button onClick={onClose} className="modal-close">✕</button>
        <p style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{isEdit ? 'Modifier le client' : 'Nouveau client'}</p>
        <p style={{ color: 'var(--nerixi-muted)', fontSize: 13, marginBottom: 22 }}>
          {isEdit ? `Édition de ${client.entreprise}` : 'Ajoute un nouveau client à ton CRM'}
        </p>

        <form onSubmit={submit}>
          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>Nom du contact</label>
              <input value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Pierre Martin" required />
            </div>
            <div>
              <label>Entreprise</label>
              <input value={form.entreprise} onChange={e => set('entreprise', e.target.value)} placeholder="Martin Commerce" required />
            </div>
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="contact@..." />
            </div>
            <div>
              <label>Téléphone</label>
              <input value={form.telephone} onChange={e => set('telephone', e.target.value)} placeholder="06 ..." />
            </div>
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>Secteur</label>
              <select value={form.secteur} onChange={e => set('secteur', e.target.value)}>
                {SECTEURS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label>Statut</label>
              <select value={form.statut} onChange={e => set('statut', e.target.value)}>
                {STATUTS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label>Date début</label>
              <input type="date" value={form.dateDebut} onChange={e => set('dateDebut', e.target.value)} />
            </div>
          </div>

          <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label>MRR (€/mois)</label>
              <input type="number" min="0" value={form.mrr} onChange={e => set('mrr', e.target.value)} />
            </div>
            <div>
              <label>Installation (€)</label>
              <input type="number" min="0" value={form.installation} onChange={e => set('installation', e.target.value)} />
            </div>
            <div>
              <label>Avancement (%)</label>
              <input type="number" min="0" max="100" value={form.avancement} onChange={e => set('avancement', e.target.value)} />
            </div>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>LinkedIn</label>
            <input value={form.linkedin} onChange={e => set('linkedin', e.target.value)} placeholder="https://linkedin.com/in/..." />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Automatisations (séparées par des virgules)</label>
            <input value={form.automatisations} onChange={e => set('automatisations', e.target.value)} placeholder="Relances devis, Voice bot, ..." />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Prochaine action</label>
            <input value={form.prochainAction} onChange={e => set('prochainAction', e.target.value)} placeholder="Démo dans 2 semaines..." />
          </div>

          <div style={{ marginBottom: 12 }}>
            <label>Tags (séparés par des virgules)</label>
            <input value={form.tags} onChange={e => set('tags', e.target.value)} placeholder="référence, btp, voice-bot" />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label>Notes</label>
            <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Notes internes..." />
          </div>

          {error && <p className="fade-in" style={{ color: '#ff8a89', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            {isEdit && (
              !confirmDelete ? (
                <button type="button" onClick={() => setConfirmDelete(true)}
                  style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', color: '#ff8a89', borderRadius: 10, padding: '11px 18px', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Supprimer
                </button>
              ) : (
                <button type="button" onClick={handleDelete} disabled={saving}
                  style={{ background: '#e24b4a', border: 'none', color: 'white', borderRadius: 10, padding: '11px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Confirmer la suppression
                </button>
              )
            )}
            <button type="submit" className="btn-primary" disabled={saving} style={{ flex: 1 }}>
              {saving ? <><span className="spinner" /> &nbsp;Enregistrement…</> : (isEdit ? 'Enregistrer les modifications' : 'Créer le client')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
