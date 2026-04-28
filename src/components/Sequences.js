'use client'
import { useEffect, useState } from 'react'
import Modal from './Modal'

export default function Sequences({ clients = [] }) {
  const [sequences, setSequences] = useState([])
  const [enrollments, setEnrollments] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [enrolling, setEnrolling] = useState(null)

  const reload = async () => {
    setLoading(true)
    try {
      const [s, e] = await Promise.all([
        fetch('/api/sequences').then(r => r.json()),
        fetch('/api/enrollments').then(r => r.json()),
      ])
      setSequences(s.sequences || [])
      setEnrollments(e.enrollments || [])
    } finally { setLoading(false) }
  }
  useEffect(() => { reload() }, [])

  const newSequence = () => setEditing({
    name: '',
    description: '',
    steps: [
      { dayOffset: 0, subject: 'Bonjour {{nom}}', content: '<p>Bonjour {{nom}},</p><p>Premier message…</p>' },
      { dayOffset: 3, subject: 'Relance — {{nom}}', content: '<p>Bonjour {{nom}},</p><p>Je reviens vers vous…</p>' },
      { dayOffset: 7, subject: 'Dernière relance', content: '<p>Bonjour {{nom}},</p><p>Je n\'ai pas eu de retour…</p>' },
    ],
  })

  const saveSequence = async () => {
    if (!editing.name.trim()) return alert('Nom requis')
    const url = editing.id ? `/api/sequences/${editing.id}` : '/api/sequences'
    const method = editing.id ? 'PUT' : 'POST'
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editing) })
    setEditing(null)
    reload()
  }

  const removeSequence = async (id) => {
    if (!confirm('Supprimer cette séquence ? Les inscriptions actives seront annulées.')) return
    await fetch(`/api/sequences/${id}`, { method: 'DELETE' })
    reload()
  }

  const enrollContact = async () => {
    if (!enrolling.recipientEmail) return alert('Email requis')
    await fetch('/api/enrollments', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(enrolling),
    })
    setEnrolling(null)
    reload()
  }

  const pauseEnrollment = async (e) => {
    await fetch(`/api/enrollments/${e.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: e.status === 'active' ? 'paused' : 'active', pausedAt: e.status === 'active' ? new Date().toISOString() : null }),
    })
    reload()
  }

  const deleteEnrollment = async (id) => {
    if (!confirm('Désinscrire ce contact ?')) return
    await fetch(`/api/enrollments/${id}`, { method: 'DELETE' })
    reload()
  }

  if (loading) return <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--nerixi-muted)' }}>Chargement…</div>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>📧 Séquences automatiques</h2>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            Drip campaigns : envoie une suite d'emails dans le temps. Stoppé automatiquement dès que le contact répond.
          </p>
        </div>
        <button onClick={newSequence} className="btn-primary">+ Nouvelle séquence</button>
      </div>

      {sequences.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 36, color: 'var(--nerixi-muted)', fontSize: 13 }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>📧</p>
          Aucune séquence. Crée ta première séquence pour automatiser tes relances.
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
          {sequences.map(seq => {
            const seqEnrolls = enrollments.filter(e => e.sequenceId === seq.id)
            const active = seqEnrolls.filter(e => e.status === 'active').length
            const paused = seqEnrolls.filter(e => e.status === 'paused').length
            const completed = seqEnrolls.filter(e => e.status === 'completed').length
            return (
              <div key={seq.id} className="card card-hover fade-in-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{seq.name}</p>
                    {seq.description && <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>{seq.description}</p>}
                  </div>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: 'var(--nerixi-surface)', color: 'var(--nerixi-muted)', fontWeight: 700 }}>{seq.steps.length} étape{seq.steps.length > 1 ? 's' : ''}</span>
                </div>

                <div style={{ display: 'flex', gap: 10, fontSize: 12, color: 'var(--nerixi-muted)', marginBottom: 12 }}>
                  <span>🟢 {active} actif{active > 1 ? 's' : ''}</span>
                  <span>⏸ {paused}</span>
                  <span>✅ {completed}</span>
                </div>

                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button onClick={() => setEnrolling({ sequenceId: seq.id, recipientEmail: '', recipientName: '' })} className="btn-primary" style={{ padding: '6px 12px', fontSize: 12 }}>+ Inscrire</button>
                  <button onClick={() => setEditing(seq)} className="btn-secondary" style={{ padding: '6px 12px', fontSize: 12 }}>Éditer</button>
                  <button onClick={() => removeSequence(seq.id)} style={{ padding: '6px 12px', fontSize: 12, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 8, cursor: 'pointer' }}>Suppr</button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {enrollments.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>📋 Inscriptions ({enrollments.length})</h3>
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
              <thead>
                <tr style={{ background: 'var(--nerixi-surface)', textAlign: 'left' }}>
                  <th style={{ padding: 10 }}>Contact</th>
                  <th style={{ padding: 10 }}>Séquence</th>
                  <th style={{ padding: 10 }}>Étape</th>
                  <th style={{ padding: 10 }}>Statut</th>
                  <th style={{ padding: 10 }}>Prochain envoi</th>
                  <th style={{ padding: 10 }}></th>
                </tr>
              </thead>
              <tbody>
                {enrollments.map(e => {
                  const seq = sequences.find(s => s.id === e.sequenceId)
                  return (
                    <tr key={e.id} style={{ borderTop: '1px solid var(--nerixi-border)' }}>
                      <td style={{ padding: 10 }}>{e.recipientName || ''} <span style={{ color: 'var(--nerixi-muted)' }}>{e.recipientEmail}</span></td>
                      <td style={{ padding: 10 }}>{seq?.name || '—'}</td>
                      <td style={{ padding: 10 }}>{e.currentStep + 1}/{seq?.steps.length || 0}</td>
                      <td style={{ padding: 10 }}>
                        {e.status === 'active' && <span style={{ color: '#10b981' }}>● actif</span>}
                        {e.status === 'paused' && <span style={{ color: '#f59e0b' }}>⏸ {e.pauseReason === 'replied' ? 'a répondu' : 'pause'}</span>}
                        {e.status === 'completed' && <span style={{ color: 'var(--nerixi-muted)' }}>✅ terminé</span>}
                      </td>
                      <td style={{ padding: 10, color: 'var(--nerixi-muted)' }}>
                        {e.status === 'active' ? new Date(e.nextSendAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                      </td>
                      <td style={{ padding: 10, textAlign: 'right' }}>
                        {e.status !== 'completed' && <button onClick={() => pauseEnrollment(e)} style={{ padding: '4px 8px', fontSize: 11, marginRight: 4, background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 6, cursor: 'pointer' }}>{e.status === 'active' ? 'Pause' : 'Reprendre'}</button>}
                        <button onClick={() => deleteEnrollment(e.id)} style={{ padding: '4px 8px', fontSize: 11, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }}>×</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {editing && (
        <Modal onClose={() => setEditing(null)}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>{editing.id ? 'Éditer la séquence' : 'Nouvelle séquence'}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input className="input" placeholder="Nom de la séquence (ex: Onboarding 14j)" value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} />
            <input className="input" placeholder="Description (optionnel)" value={editing.description} onChange={e => setEditing({ ...editing, description: e.target.value })} />

            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: 0.6, marginTop: 6 }}>Étapes</p>
            {editing.steps.map((step, i) => (
              <div key={i} className="card" style={{ padding: 12, background: 'var(--nerixi-surface)' }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#00c878', color: 'white', fontWeight: 700 }}>Étape {i + 1}</span>
                  <label style={{ fontSize: 12 }}>J+</label>
                  <input className="input" type="number" min="0" style={{ width: 70 }} value={step.dayOffset} onChange={e => {
                    const steps = [...editing.steps]
                    steps[i] = { ...step, dayOffset: Number(e.target.value) }
                    setEditing({ ...editing, steps })
                  }} />
                  <button onClick={() => setEditing({ ...editing, steps: editing.steps.filter((_, j) => j !== i) })} style={{ marginLeft: 'auto', padding: '4px 10px', fontSize: 11, background: 'transparent', color: '#ef4444', border: '1px solid #ef4444', borderRadius: 6, cursor: 'pointer' }}>Suppr</button>
                </div>
                <input className="input" placeholder="Sujet (variables: {{nom}}, {{email}})" value={step.subject} onChange={e => {
                  const steps = [...editing.steps]
                  steps[i] = { ...step, subject: e.target.value }
                  setEditing({ ...editing, steps })
                }} />
                <textarea className="input" rows={5} placeholder="Contenu HTML…" style={{ marginTop: 6, fontFamily: 'monospace', fontSize: 12 }} value={step.content} onChange={e => {
                  const steps = [...editing.steps]
                  steps[i] = { ...step, content: e.target.value }
                  setEditing({ ...editing, steps })
                }} />
              </div>
            ))}
            <button onClick={() => setEditing({ ...editing, steps: [...editing.steps, { dayOffset: (editing.steps.at(-1)?.dayOffset || 0) + 7, subject: '', content: '' }] })} className="btn-secondary" style={{ alignSelf: 'flex-start', padding: '6px 12px', fontSize: 12 }}>+ Ajouter étape</button>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setEditing(null)} className="btn-secondary">Annuler</button>
              <button onClick={saveSequence} className="btn-primary">Enregistrer</button>
            </div>
          </div>
        </Modal>
      )}

      {enrolling && (
        <Modal onClose={() => setEnrolling(null)}>
          <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 14 }}>Inscrire un contact</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <select className="input" value={enrolling.clientId || ''} onChange={e => {
              const c = clients.find(cc => cc.id === Number(e.target.value))
              if (c) setEnrolling({ ...enrolling, clientId: c.id, recipientEmail: c.email, recipientName: c.nom })
              else setEnrolling({ ...enrolling, clientId: null })
            }}>
              <option value="">— Choisir un client (ou saisir manuellement) —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.entreprise} — {c.nom} ({c.email})</option>)}
            </select>
            <input className="input" placeholder="Email" value={enrolling.recipientEmail} onChange={e => setEnrolling({ ...enrolling, recipientEmail: e.target.value })} />
            <input className="input" placeholder="Nom (optionnel)" value={enrolling.recipientName} onChange={e => setEnrolling({ ...enrolling, recipientName: e.target.value })} />
            <p style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>Le 1er email sera envoyé à la prochaine exécution du cron (toutes les heures sur Vercel).</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setEnrolling(null)} className="btn-secondary">Annuler</button>
              <button onClick={enrollContact} className="btn-primary">Inscrire</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
