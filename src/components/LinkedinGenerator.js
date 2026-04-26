'use client'
import { useEffect, useMemo, useState } from 'react'

const TYPES = [
  { id: 'tofu',      label: 'Post TOFU',         icon: '🎯', placeholder: 'Ex: Pourquoi 80% des PME perdent du temps sur les relances devis' },
  { id: 'bofu',      label: 'Post BOFU',         icon: '💼', placeholder: 'Ex: Comment Martin Commerce a récupéré 23k€ en 3 mois' },
  { id: 'planning',  label: 'Planning du mois',  icon: '📅', placeholder: 'Ex: Mai 2026' },
  { id: 'hook',      label: '5 hooks',           icon: '🪝', placeholder: 'Ex: Automatisation comptable PME' },
  { id: 'carrousel', label: 'Carrousel PDF',     icon: '🎞️', placeholder: 'Ex: 7 automatisations à mettre en place cette année' },
  { id: 'recycler',  label: 'Recycler contenu',  icon: '♻️', placeholder: 'Colle ici un cas client / post GBP / article…', textarea: true },
]

const TYPE_BADGE = {
  tofu:      { label: 'TOFU',      color: '#6cb6f5' },
  bofu:      { label: 'BOFU',      color: '#00e89a' },
  planning:  { label: 'PLANNING',  color: '#fac775' },
  hook:      { label: 'HOOKS',     color: '#b89cff' },
  carrousel: { label: 'CARROUSEL', color: '#36e6c4' },
  recycler:  { label: 'RECYCLE',   color: '#ffffff' },
}

export default function LinkedinGenerator({ posts = [], onPostsChange }) {
  const [type, setType] = useState('tofu')
  const [sujet, setSujet] = useState('')
  const [extra, setExtra] = useState('')
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)

  const currentType = TYPES.find(t => t.id === type) || TYPES[0]
  const isTextarea = !!currentType.textarea

  const generate = async () => {
    setError('')
    if (!sujet.trim()) { setError('Saisis un sujet'); return }
    setGenerating(true)
    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, sujet: sujet.trim(), extra: extra.trim() || null }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur')
      onPostsChange(prev => [data.post, ...prev.filter(p => p.id !== data.post.id)])
      setSujet('')
      setExtra('')
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  const copy = async (post) => {
    await navigator.clipboard.writeText(post.contenu)
    setCopiedId(post.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const remove = async (id) => {
    await fetch(`/api/linkedin/posts/${id}`, { method: 'DELETE' })
    onPostsChange(prev => prev.filter(p => p.id !== id))
    setConfirmDelete(null)
  }

  const regenerate = async (post) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/linkedin/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: post.type, sujet: post.sujet }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || 'Erreur')
      onPostsChange(prev => [data.post, ...prev])
    } catch (e) {
      setError(e.message)
    }
    setGenerating(false)
  }

  return (
    <div>
      <div className="card fade-in-up" style={{ marginBottom: 22 }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 10 }}>
          ✨ Nouvelle publication via n8n
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
          {TYPES.map(t => (
            <button key={t.id} onClick={() => setType(t.id)}
              style={{
                background: type === t.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.5)',
                border: `1px solid ${type === t.id ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                borderRadius: 999, padding: '7px 14px',
                color: type === t.id ? '#06101f' : 'var(--nerixi-text)',
                cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                display: 'inline-flex', alignItems: 'center', gap: 6,
                transition: 'all 0.15s ease',
              }}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <label>{type === 'planning' ? 'Mois' : type === 'hook' ? 'Thème' : type === 'recycler' ? 'Contenu source' : 'Sujet'}</label>
            {isTextarea ? (
              <textarea value={sujet} onChange={e => setSujet(e.target.value)} placeholder={currentType.placeholder} rows={4} style={{ resize: 'vertical' }} />
            ) : (
              <input value={sujet} onChange={e => setSujet(e.target.value)} placeholder={currentType.placeholder}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); generate() } }} />
            )}
          </div>
          <button onClick={generate} disabled={generating || !sujet.trim()} className="btn-primary" style={{ padding: '11px 22px', fontSize: 14, minWidth: 200 }}>
            {generating ? <><span className="spinner" /> &nbsp;Génération…</> : '✨ Générer la publication'}
          </button>
        </div>
        {error && <p className="fade-in" style={{ color: '#ff8a89', fontSize: 13, marginTop: 10 }}>⚠ {error}</p>}
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 10 }}>
          La publication respecte les règles d'or Nerixi (hook 1-3 lignes, 1 message, chiffres réels, CTA, 3 hashtags max, pas de lien dans le post).
        </p>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
        <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
          📚 Publications générées ({posts.length})
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>✨</p>
          <p>Aucune publication encore.</p>
          <p style={{ fontSize: 12, marginTop: 4 }}>Choisis un type, donne un sujet, clique Générer.</p>
        </div>
      ) : (
        <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {posts.map(p => {
            const badge = TYPE_BADGE[p.type] || { label: p.type, color: '#7a9bb0' }
            return (
              <div key={p.id} className="card fade-in-up">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 8, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                    <span style={{
                      background: `${badge.color}20`,
                      color: badge.color,
                      border: `1px solid ${badge.color}55`,
                      borderRadius: 999, padding: '3px 10px',
                      fontSize: 10.5, fontWeight: 700, letterSpacing: 1,
                    }}>{badge.label}</span>
                    <p style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.sujet}</p>
                    <span style={{ fontSize: 10.5, color: 'var(--nerixi-muted)' }}>
                      {new Date(p.createdAt).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <button onClick={() => regenerate(p)} disabled={generating}
                      style={{ background: 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '7px 12px', color: 'var(--nerixi-text)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                      ↻ Re-générer
                    </button>
                    <button onClick={() => copy(p)}
                      style={{
                        background: copiedId === p.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.5)',
                        border: `1px solid ${copiedId === p.id ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                        borderRadius: 8, padding: '7px 12px',
                        color: copiedId === p.id ? '#06101f' : 'var(--nerixi-text)',
                        cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      }}>
                      {copiedId === p.id ? '✓ Copié' : '📋 Copier'}
                    </button>
                    {confirmDelete === p.id ? (
                      <button onClick={() => remove(p.id)}
                        style={{ background: '#e24b4a', border: 'none', borderRadius: 8, padding: '7px 12px', color: 'white', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                        Confirmer
                      </button>
                    ) : (
                      <button onClick={() => setConfirmDelete(p.id)}
                        style={{ background: 'transparent', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 8, padding: '7px 10px', color: '#ff8a89', cursor: 'pointer', fontSize: 12 }}>
                        ✕
                      </button>
                    )}
                  </div>
                </div>
                <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-line', color: 'var(--nerixi-text)' }}>
                  {p.contenu}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
