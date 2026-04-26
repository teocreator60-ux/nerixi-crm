'use client'
import { useMemo, useState } from 'react'

function fillVars(text, vars) {
  if (!text) return ''
  return text.replace(/{(\w+)}/g, (m, k) => vars[k] != null ? vars[k] : m)
}

function clientVars(c) {
  return {
    prenom:     (c.nom || '').split(' ')[0] || '',
    nom:        c.nom || '',
    entreprise: c.entreprise || '',
    email:      c.email || '',
    secteur:    c.secteur || '',
    mois:       new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    mrr:        c.mrr || 0,
  }
}

export default function Composer({ clients = [], lists = [], emailTemplates = [] }) {
  const [mode, setMode] = useState('list')         // 'manual' | 'list' | 'individual'
  const [listId, setListId] = useState('')
  const [individualIds, setIndividualIds] = useState(new Set())
  const [manualEmails, setManualEmails] = useState('')

  const [templateId, setTemplateId] = useState('')
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')

  const [showPreview, setShowPreview] = useState(false)
  const [previewIdx, setPreviewIdx] = useState(0)

  const [sending, setSending] = useState(false)
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState('')

  const selectedTemplate = emailTemplates.find(t => t.id === templateId)

  const applyTemplate = (id) => {
    setTemplateId(id)
    const t = emailTemplates.find(x => x.id === id)
    if (t) {
      setSubject(t.subject || '')
      setContent(t.html || '')
    }
  }

  const recipients = useMemo(() => {
    if (mode === 'manual') {
      return manualEmails
        .split(/[,;\n]/)
        .map(s => s.trim())
        .filter(s => /\S+@\S+\.\S+/.test(s))
        .map(email => ({
          email,
          nom: email.split('@')[0],
          entreprise: '',
        }))
    }
    if (mode === 'list') {
      const list = lists.find(l => l.id === listId)
      if (!list) return []
      return list.clientIds
        .map(id => clients.find(c => c.id === id))
        .filter(c => c && c.email)
    }
    if (mode === 'individual') {
      return Array.from(individualIds)
        .map(id => clients.find(c => c.id === id))
        .filter(c => c && c.email)
    }
    return []
  }, [mode, listId, individualIds, manualEmails, lists, clients])

  const toggleIndividual = (id) => {
    setIndividualIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const previewRecipient = recipients[previewIdx] || recipients[0]
  const previewVars = previewRecipient
    ? (previewRecipient.id ? clientVars(previewRecipient) : { prenom: previewRecipient.nom, nom: previewRecipient.nom, entreprise: '', email: previewRecipient.email, mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), mrr: 0 })
    : { prenom: 'Test', nom: 'Test', entreprise: 'Test', email: 'test@test.com', mois: '', mrr: 0 }

  const send = async () => {
    setError('')
    if (!subject || !content) { setError('Sujet et contenu requis'); return }
    if (recipients.length === 0) { setError('Aucun destinataire'); return }

    if (recipients.length > 5) {
      if (!confirm(`Envoyer cet email à ${recipients.length} destinataires ?`)) return
    }

    setSending(true)
    setProgress({ done: 0, total: recipients.length, success: 0, failed: 0, errors: [] })

    for (let i = 0; i < recipients.length; i++) {
      const r = recipients[i]
      const vars = r.id ? clientVars(r) : { prenom: r.nom, nom: r.nom, entreprise: '', email: r.email, mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), mrr: 0 }
      const filledSubject = fillVars(subject, vars)
      const filledContent = fillVars(content, vars)
      try {
        const res = await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ to: r.email, toName: r.nom || '', subject: filledSubject, content: filledContent }),
        })
        const data = await res.json()
        setProgress(p => ({
          ...p,
          done: i + 1,
          success: p.success + (data.success ? 1 : 0),
          failed: p.failed + (data.success ? 0 : 1),
          errors: data.success ? p.errors : [...p.errors, `${r.email}: ${data.error || 'erreur'}`],
        }))
      } catch (e) {
        setProgress(p => ({
          ...p,
          done: i + 1,
          failed: p.failed + 1,
          errors: [...p.errors, `${r.email}: ${e.message}`],
        }))
      }
    }
    setSending(false)
  }

  return (
    <div className="card fade-in-up">
      <p style={{ fontWeight: 800, fontSize: 16, marginBottom: 6 }}>✏️ Composer un email</p>
      <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginBottom: 18 }}>Choisis un template, des destinataires (liste, sélection ou emails libres), et envoie en un clic.</p>

      <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>1. Destinataires</p>
      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 10, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 3, flexWrap: 'wrap' }}>
        {[
          { id: 'list',       label: '📋 Liste enregistrée' },
          { id: 'individual', label: '👥 Sélection clients' },
          { id: 'manual',     label: '✉️ Emails libres' },
        ].map(m => (
          <button key={m.id} onClick={() => setMode(m.id)}
            style={{
              background: mode === m.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              border: 'none', borderRadius: 7, padding: '6px 12px',
              color: mode === m.id ? '#06101f' : 'var(--nerixi-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: 12,
            }}>{m.label}</button>
        ))}
      </div>

      {mode === 'list' && (
        <div style={{ marginBottom: 14 }}>
          <select value={listId} onChange={e => setListId(e.target.value)}>
            <option value="">— Choisir une liste —</option>
            {lists.map(l => <option key={l.id} value={l.id}>{l.name} ({l.clientIds?.length || 0})</option>)}
          </select>
        </div>
      )}

      {mode === 'individual' && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 6, maxHeight: 200, overflowY: 'auto' }}>
            {clients.length === 0 ? (
              <p style={{ padding: 14, textAlign: 'center', color: 'var(--nerixi-muted)', fontSize: 13 }}>Aucun client.</p>
            ) : clients.map(c => {
              const checked = individualIds.has(c.id)
              return (
                <label key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 8px', borderRadius: 6, cursor: 'pointer', textTransform: 'none', letterSpacing: 0, background: checked ? 'rgba(0,200,120,0.08)' : 'transparent' }}>
                  <input type="checkbox" checked={checked} onChange={() => toggleIndividual(c.id)} style={{ width: 15, height: 15, accentColor: 'var(--nerixi-green)' }} />
                  <span style={{ fontSize: 12.5, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {c.entreprise} · <span style={{ color: 'var(--nerixi-muted)' }}>{c.email || 'pas d\'email'}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
      )}

      {mode === 'manual' && (
        <div style={{ marginBottom: 14 }}>
          <textarea value={manualEmails} onChange={e => setManualEmails(e.target.value)} rows={3} placeholder="email1@client.fr, email2@autre.com&#10;email3@plus.fr"
            style={{ resize: 'vertical' }} />
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 4 }}>Sépare par virgule, point-virgule ou retour ligne.</p>
        </div>
      )}

      <div style={{
        marginBottom: 18,
        padding: '8px 12px',
        background: recipients.length > 0 ? 'rgba(0,200,120,0.08)' : 'rgba(250,199,117,0.08)',
        border: `1px solid ${recipients.length > 0 ? 'rgba(0,200,120,0.3)' : 'rgba(250,199,117,0.3)'}`,
        borderRadius: 10, fontSize: 12.5,
        color: recipients.length > 0 ? 'var(--nerixi-accent)' : '#fac775',
        fontWeight: 600,
      }}>
        {recipients.length} destinataire{recipients.length > 1 ? 's' : ''} prêt{recipients.length > 1 ? 's' : ''} à recevoir
        {recipients.length > 0 && <span style={{ color: 'var(--nerixi-muted)', fontWeight: 400, marginLeft: 8 }}>
          ({recipients.slice(0, 3).map(r => r.email).join(', ')}{recipients.length > 3 ? ` … +${recipients.length - 3}` : ''})
        </span>}
      </div>

      <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>2. Template (optionnel)</p>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        <select value={templateId} onChange={e => applyTemplate(e.target.value)} style={{ flex: 1, minWidth: 220 }}>
          <option value="">— Aucun template (édition libre) —</option>
          {emailTemplates.map(t => <option key={t.id} value={t.id}>🎨 {t.name}</option>)}
        </select>
        {templateId && (
          <button onClick={() => { setTemplateId(''); setSubject(''); setContent('') }}
            style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, color: 'var(--nerixi-muted)', cursor: 'pointer', padding: '8px 14px', fontSize: 12 }}>
            Réinitialiser
          </button>
        )}
      </div>

      <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>3. Sujet</p>
      <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Bonjour {prenom} — message Nerixi" style={{ marginBottom: 14 }} />

      <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>
        4. Contenu {selectedTemplate ? '(HTML — issu du template)' : '(texte ou HTML)'}
      </p>
      <textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Bonjour {prenom},..." rows={selectedTemplate ? 8 : 6}
        style={{ resize: 'vertical', fontFamily: selectedTemplate ? 'ui-monospace, Menlo, monospace' : 'inherit', fontSize: selectedTemplate ? 12 : 14, marginBottom: 12 }} />

      {recipients.length > 0 && (
        <button onClick={() => setShowPreview(s => !s)}
          style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, color: 'var(--nerixi-muted)', cursor: 'pointer', padding: '6px 12px', fontSize: 12, marginBottom: 12 }}>
          {showPreview ? '▼ Masquer aperçu' : '▶ Aperçu (variables remplies)'}
        </button>
      )}

      {showPreview && previewRecipient && (
        <div style={{ marginBottom: 16 }}>
          {recipients.length > 1 && (
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginBottom: 8 }}>
              <button onClick={() => setPreviewIdx(i => Math.max(0, i - 1))} disabled={previewIdx === 0}
                style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 6, padding: '3px 9px', color: 'var(--nerixi-text)', cursor: 'pointer' }}>‹</button>
              <span style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>{previewIdx + 1} / {recipients.length} · {previewRecipient.email}</span>
              <button onClick={() => setPreviewIdx(i => Math.min(recipients.length - 1, i + 1))} disabled={previewIdx === recipients.length - 1}
                style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 6, padding: '3px 9px', color: 'var(--nerixi-text)', cursor: 'pointer' }}>›</button>
            </div>
          )}
          <div style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 12 }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 4 }}>SUJET</p>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 10 }}>{fillVars(subject, previewVars)}</p>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 4 }}>CONTENU</p>
            <iframe srcDoc={fillVars(content, previewVars)} sandbox=""
              style={{ width: '100%', height: 280, border: '1px solid var(--nerixi-border)', borderRadius: 8, background: '#fff' }} />
          </div>
        </div>
      )}

      {error && <p className="fade-in" style={{ color: '#ff8a89', fontSize: 13, marginBottom: 10 }}>⚠ {error}</p>}

      {progress && (
        <div style={{ background: 'rgba(10,22,40,0.7)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, fontSize: 12.5 }}>
            <span style={{ fontWeight: 700 }}>{progress.done} / {progress.total} envoyés</span>
            <span>
              <span style={{ color: 'var(--nerixi-accent)' }}>{progress.success} ✓</span>
              {progress.failed > 0 && <span style={{ color: '#ff8a89', marginLeft: 10 }}>{progress.failed} ✗</span>}
            </span>
          </div>
          <div className="progress-bar"><div style={{ width: `${(progress.done / progress.total) * 100}%` }} /></div>
          {progress.errors.length > 0 && (
            <details style={{ marginTop: 8, fontSize: 11.5, color: '#ff8a89' }}>
              <summary style={{ cursor: 'pointer' }}>{progress.errors.length} erreur{progress.errors.length > 1 ? 's' : ''}</summary>
              <ul style={{ paddingLeft: 18, marginTop: 6 }}>
                {progress.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            </details>
          )}
        </div>
      )}

      <button onClick={send} disabled={sending || recipients.length === 0 || !subject || !content}
        className="btn-primary" style={{ width: '100%', padding: '12px 22px' }}>
        {sending
          ? <><span className="spinner" /> &nbsp;Envoi en cours…</>
          : (recipients.length > 1 ? `Envoyer à ${recipients.length} destinataires via Brevo` : 'Envoyer via Brevo')}
      </button>
    </div>
  )
}
