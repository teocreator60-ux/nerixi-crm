'use client'
import { useEffect, useMemo, useState } from 'react'

const DEFAULTS = {
  fullName: 'Téo',
  role: 'Fondateur',
  company: 'Nerixi',
  tagline: 'Automatisation IA pour PME',
  email: 'info@nerixi.com',
  phone: '',
  website: 'https://nerixi.fr',
  linkedin: '',
  calendar: '',
  logoUrl: '/logo-nerixi.jpg',
  primaryColor: '#00c878',
  accentColor: '#36e6c4',
  ctaText: '📅 Réserver un appel',
}

function buildHTML(s) {
  const linkStyle = `color:${s.primaryColor};text-decoration:none;font-weight:500`
  const muted = '#7a8a9a'
  const links = []
  if (s.linkedin) links.push(`<a href="${s.linkedin}" style="${linkStyle}">LinkedIn</a>`)
  if (s.website) links.push(`<a href="${s.website}" style="${linkStyle}">Site</a>`)
  if (s.email) links.push(`<a href="mailto:${s.email}" style="${linkStyle}">${s.email}</a>`)
  const linkLine = links.join(' &nbsp;·&nbsp; ')

  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:'Inter','Segoe UI',Arial,sans-serif;color:#0a1628;line-height:1.5">
  <tr>
    <td style="vertical-align:middle;padding-right:18px;border-right:3px solid ${s.primaryColor}">
      ${s.logoUrl ? `<img src="${s.logoUrl}" alt="${s.company}" width="56" height="56" style="display:block;border-radius:8px;object-fit:cover" />` : ''}
    </td>
    <td style="vertical-align:middle;padding-left:18px">
      <p style="margin:0;font-size:15px;font-weight:700;color:#0a1628">${s.fullName}</p>
      <p style="margin:2px 0 0;font-size:12.5px;color:${muted}">${s.role}${s.company ? ` · <strong style="color:${s.primaryColor}">${s.company}</strong>` : ''}</p>
      ${s.tagline ? `<p style="margin:6px 0 0;font-size:11.5px;color:${muted};font-style:italic">${s.tagline}</p>` : ''}
      ${s.phone ? `<p style="margin:8px 0 0;font-size:12px;color:#0a1628">📞 ${s.phone}</p>` : ''}
      ${linkLine ? `<p style="margin:8px 0 0;font-size:12px">${linkLine}</p>` : ''}
      ${s.calendar ? `<p style="margin:12px 0 0">
        <a href="${s.calendar}" style="display:inline-block;background:linear-gradient(135deg,${s.primaryColor},${s.accentColor});color:#06101f;padding:8px 16px;border-radius:8px;text-decoration:none;font-weight:700;font-size:12px">${s.ctaText}</a>
      </p>` : ''}
    </td>
  </tr>
</table>`
}

export default function SignatureBuilder({ initial }) {
  const [s, setS] = useState({ ...DEFAULTS, ...(initial || {}) })
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (initial) setS(prev => ({ ...prev, ...initial }))
  }, [initial])

  const html = useMemo(() => buildHTML(s), [s])

  const setField = (k, v) => setS(prev => ({ ...prev, [k]: v }))

  const copyHTML = async () => {
    try {
      await navigator.clipboard.writeText(html)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = html; document.body.appendChild(ta); ta.select(); document.execCommand('copy')
      document.body.removeChild(ta)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyRich = async () => {
    try {
      // Crée un Blob HTML pour coller dans Gmail / Outlook
      const blob = new Blob([html], { type: 'text/html' })
      const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': new Blob([s.fullName + ' · ' + s.email], { type: 'text/plain' }) })]
      await navigator.clipboard.write(data)
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback : copie HTML texte
      copyHTML()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10, flexWrap: 'wrap' }}>
        <div>
          <h2 style={{ fontSize: 20, fontWeight: 700 }}>✍️ Signature email</h2>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>Génère ta signature pro et copie-la dans Gmail / Outlook / Brevo.</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={copyHTML} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {copied ? '✓ Copié' : '📄 Copier HTML'}
          </button>
          <button onClick={copyRich} className="btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
            {copied ? '✓ Copié' : '📋 Copier (Gmail)'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', gap: 14 }}>
        {/* Form */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>Tes infos</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
            <input placeholder="Nom complet" value={s.fullName} onChange={e => setField('fullName', e.target.value)} />
            <input placeholder="Rôle" value={s.role} onChange={e => setField('role', e.target.value)} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
            <input placeholder="Société" value={s.company} onChange={e => setField('company', e.target.value)} />
            <input placeholder="Téléphone" value={s.phone} onChange={e => setField('phone', e.target.value)} />
          </div>
          <input placeholder="Tagline (ex: Automatisation IA pour PME)" value={s.tagline} onChange={e => setField('tagline', e.target.value)} />
          <input type="email" placeholder="Email" value={s.email} onChange={e => setField('email', e.target.value)} />
          <input placeholder="Site web (https://...)" value={s.website} onChange={e => setField('website', e.target.value)} />
          <input placeholder="LinkedIn (https://...)" value={s.linkedin} onChange={e => setField('linkedin', e.target.value)} />
          <input placeholder="Lien Calendrier de RDV (Calendly, Cal.com, etc.)" value={s.calendar} onChange={e => setField('calendar', e.target.value)} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 140px), 1fr))', gap: 8 }}>
            <label style={{ fontSize: 11.5 }}>URL logo (image carrée)
              <input value={s.logoUrl} onChange={e => setField('logoUrl', e.target.value)} placeholder="/logo-nerixi.jpg" />
            </label>
            <label style={{ fontSize: 11.5 }}>Couleur primaire
              <input type="color" value={s.primaryColor} onChange={e => setField('primaryColor', e.target.value)} style={{ height: 38, padding: 4 }} />
            </label>
          </div>
          {s.calendar && (
            <input placeholder="Texte du bouton CTA" value={s.ctaText} onChange={e => setField('ctaText', e.target.value)} />
          )}
        </div>

        {/* Preview */}
        <div>
          <div className="card" style={{ background: 'white', color: '#0a1628' }}>
            <p style={{ fontSize: 11, color: '#7a8a9a', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 14 }}>Aperçu (rendu HTML réel)</p>
            <div dangerouslySetInnerHTML={{ __html: html }} />
          </div>
          <details style={{ marginTop: 12 }}>
            <summary style={{ fontSize: 12, color: 'var(--nerixi-muted)', cursor: 'pointer', padding: 8 }}>📄 Voir le code HTML brut</summary>
            <textarea readOnly rows={10} value={html} style={{ marginTop: 8, fontFamily: 'monospace', fontSize: 11, lineHeight: 1.5 }} />
          </details>

          <div className="card" style={{ marginTop: 12, fontSize: 12, color: 'var(--nerixi-muted)' }}>
            <p style={{ fontWeight: 700, color: 'var(--nerixi-text)', marginBottom: 6 }}>Comment l'utiliser ?</p>
            <p>📧 <strong>Gmail :</strong> Paramètres → Général → Signature → "Copier (Gmail)" puis colle</p>
            <p>📧 <strong>Outlook :</strong> Fichier → Options → Courrier → Signatures → colle (mode HTML)</p>
            <p>📧 <strong>Brevo :</strong> Settings → Email senders → Edit signature → mode HTML → colle le code</p>
          </div>
        </div>
      </div>
    </div>
  )
}
