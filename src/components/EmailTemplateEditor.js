'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

const STARTER_HTML = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>{subject}</title>
</head>
<body style="font-family: -apple-system, 'Segoe UI', Inter, sans-serif; background: #f4f4f4; margin: 0; padding: 0;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: #f4f4f4; padding: 40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" border="0" style="background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.08);">
        <tr>
          <td style="background: #0a1628; padding: 32px; text-align: center;">
            <h1 style="color: #00c878; margin: 0; font-size: 28px; letter-spacing: 2px;">NERIXI</h1>
          </td>
        </tr>
        <tr>
          <td style="padding: 36px 32px; color: #333; line-height: 1.7;">
            <h2 style="color: #0a1628; margin-top: 0;">Bonjour {prenom},</h2>
            <p>Voici votre rapport mensuel pour <strong>{entreprise}</strong>.</p>

            <p>Ce mois-ci, vos automatisations ont permis de gagner <strong>12 heures</strong> sur les tâches répétitives.</p>

            <div style="margin: 24px 0; text-align: center;">
              <a href="https://nerixi.fr" style="display: inline-block; background: #00c878; color: #0a1628; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 700;">Accéder au dashboard</a>
            </div>

            <p>Cordialement,<br><strong>Téo</strong><br>Fondateur · Nerixi</p>
          </td>
        </tr>
        <tr>
          <td style="background: #0a1628; padding: 24px; text-align: center;">
            <p style="color: #7a9bb0; font-size: 12px; margin: 0;"><a href="https://nerixi.fr" style="color: #00c878; text-decoration: none;">nerixi.fr</a> · <a href="mailto:info@nerixi.com" style="color: #00c878; text-decoration: none;">info@nerixi.com</a></p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`

const VARIABLES = [
  { key: 'prenom',     label: 'Prénom' },
  { key: 'nom',        label: 'Nom complet' },
  { key: 'entreprise', label: 'Entreprise' },
  { key: 'email',      label: 'Email' },
  { key: 'mois',       label: 'Mois en cours' },
  { key: 'mrr',        label: 'MRR' },
  { key: 'subject',    label: 'Sujet' },
]

function fillVars(text, sampleVars) {
  if (!text) return ''
  return text.replace(/{(\w+)}/g, (m, k) => sampleVars[k] != null ? sampleVars[k] : m)
}

export default function EmailTemplateEditor({ initial, onClose, onSaved, onDeleted }) {
  const [name, setName]       = useState(initial?.name || 'Nouveau template')
  const [subject, setSubject] = useState(initial?.subject || 'Bonjour {prenom}')
  const [html, setHtml]       = useState(initial?.html || STARTER_HTML)
  const [view, setView]       = useState('split') // split | code | preview
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')
  const [confirmDel, setConfirmDel] = useState(false)
  const taRef = useRef(null)
  const isEdit = !!initial?.id

  const sampleVars = {
    prenom: 'Pierre',
    nom: 'Pierre Martin',
    entreprise: 'Martin Commerce',
    email: 'pierre@martincommerce.fr',
    mois: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }),
    mrr: '1500',
    subject,
  }

  const previewHtml = useMemo(() => fillVars(html, sampleVars).replace('{subject}', subject), [html, subject])

  const insertVar = (key) => {
    const ta = taRef.current
    if (!ta) return
    const start = ta.selectionStart, end = ta.selectionEnd
    const before = html.slice(0, start)
    const after = html.slice(end)
    const insert = `{${key}}`
    setHtml(before + insert + after)
    setTimeout(() => { ta.focus(); ta.setSelectionRange(start + insert.length, start + insert.length) }, 0)
  }

  const save = async () => {
    if (!name.trim()) { setError('Donne un nom au template'); return }
    setSaving(true); setError('')
    try {
      const url = isEdit ? `/api/email-templates/${initial.id}` : '/api/email-templates'
      const method = isEdit ? 'PUT' : 'POST'
      const res = await fetch(url, {
        method, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, html }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      onSaved?.(data.template)
      onClose()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  const handleDelete = async () => {
    setSaving(true)
    try {
      await fetch(`/api/email-templates/${initial.id}`, { method: 'DELETE' })
      onDeleted?.(initial.id)
      onClose()
    } catch (e) { setError(e.message) }
    setSaving(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 170, padding: 12 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: 1200, width: '100%', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>
        <button onClick={onClose} className="modal-close">✕</button>

        <div style={{ marginBottom: 16, paddingRight: 40 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 4 }}>{isEdit ? 'Modifier le template' : 'Nouveau template HTML'}</p>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="Nom du template (ex: Rapport mensuel)"
            style={{ fontSize: 18, fontWeight: 700, background: 'transparent', border: 'none', padding: 0, color: 'var(--nerixi-text)' }} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, marginBottom: 12, alignItems: 'flex-end' }}>
          <div>
            <label>Sujet de l'email</label>
            <input value={subject} onChange={e => setSubject(e.target.value)} placeholder="Bonjour {prenom} — Rapport mensuel" />
          </div>
          <div style={{ display: 'inline-flex', gap: 4, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 3 }}>
            {[
              { id: 'split',   label: '⬛⬜ Split' },
              { id: 'code',    label: '< > Code' },
              { id: 'preview', label: '👁 Preview' },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                style={{
                  background: view === v.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
                  border: 'none', borderRadius: 8, padding: '6px 12px',
                  color: view === v.id ? '#06101f' : 'var(--nerixi-muted)',
                  cursor: 'pointer', fontSize: 11.5, fontWeight: 600,
                }}>{v.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 10 }}>
          <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 6 }}>Variables (clique pour insérer)</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {VARIABLES.map(v => (
              <button key={v.key} onClick={() => insertVar(v.key)}
                style={{
                  background: 'rgba(0,200,120,0.08)',
                  border: '1px solid var(--nerixi-border)',
                  borderRadius: 999, padding: '4px 10px',
                  color: 'var(--nerixi-accent)', fontSize: 11.5,
                  cursor: 'pointer', fontFamily: 'ui-monospace, Menlo, monospace',
                }}>{`{${v.key}}`}</button>
            ))}
          </div>
        </div>

        <div style={{
          flex: 1, minHeight: 0,
          display: 'grid',
          gridTemplateColumns: view === 'split' ? '1fr 1fr' : '1fr',
          gap: 12, marginBottom: 14,
        }}>
          {(view === 'split' || view === 'code') && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
              <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 6 }}>HTML</p>
              <textarea
                ref={taRef}
                value={html}
                onChange={e => setHtml(e.target.value)}
                spellCheck={false}
                style={{
                  flex: 1, minHeight: 380,
                  fontFamily: 'ui-monospace, Menlo, monospace',
                  fontSize: 12.5, lineHeight: 1.5,
                  resize: 'none',
                }}
              />
            </div>
          )}
          {(view === 'split' || view === 'preview') && (
            <div style={{ display: 'flex', flexDirection: 'column', minHeight: 380 }}>
              <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 6 }}>Aperçu (avec variables remplies)</p>
              <iframe
                srcDoc={previewHtml}
                title="Aperçu email"
                sandbox=""
                style={{
                  flex: 1, minHeight: 380,
                  border: '1px solid var(--nerixi-border)',
                  borderRadius: 10,
                  background: '#ffffff',
                  width: '100%',
                }}
              />
            </div>
          )}
        </div>

        {error && <p className="fade-in" style={{ color: '#ff8a89', fontSize: 13, marginBottom: 10 }}>⚠ {error}</p>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {isEdit && (
            !confirmDel ? (
              <button type="button" onClick={() => setConfirmDel(true)}
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
          <button onClick={save} disabled={saving} className="btn-primary" style={{ flex: 1, minWidth: 200, padding: '11px 22px' }}>
            {saving ? <><span className="spinner" /> &nbsp;Enregistrement…</> : (isEdit ? 'Enregistrer' : 'Créer le template')}
          </button>
        </div>
      </div>
    </div>
  )
}
