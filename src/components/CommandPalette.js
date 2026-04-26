'use client'
import { useEffect, useMemo, useRef, useState } from 'react'

const META_KEY = typeof window !== 'undefined' && /Mac/i.test(window.navigator.platform) ? '⌘' : 'Ctrl'

function fuzzyMatch(query, text) {
  if (!query) return { match: true, score: 0 }
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  if (t.includes(q)) return { match: true, score: 100 - t.indexOf(q) }
  let qi = 0, score = 0
  for (let i = 0; i < t.length && qi < q.length; i++) {
    if (t[i] === q[qi]) { score++; qi++ }
  }
  return { match: qi === q.length, score }
}

export default function CommandPalette({ open, onClose, ctx }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 30)
    }
  }, [open])

  const commands = useMemo(() => {
    if (!ctx) return []
    const out = []

    // Navigation
    const tabs = [
      { id: 'Dashboard', icon: '📊', sub: 'Aperçu' },
      { id: 'Clients',   icon: '👥', sub: 'Liste clients' },
      { id: 'Kanban',    icon: '🎯', sub: 'Vue pipeline' },
      { id: 'Agenda',    icon: '📅', sub: 'Rappels' },
      { id: 'Suivi',     icon: '💰', sub: 'Suivi paiements' },
      { id: 'Stripe',    icon: '💳', sub: 'Transactions' },
      { id: 'Emails',    icon: '📧', sub: 'Brevo' },
      { id: 'LinkedIn',  icon: '💼', sub: 'Templates' },
    ]
    tabs.forEach(t => out.push({
      section: 'Navigation',
      icon: t.icon,
      label: `Aller à ${t.id}`,
      sub: t.sub,
      run: () => ctx.setActiveTab(t.id),
    }))

    // Actions
    out.push(
      { section: 'Actions', icon: '➕', label: 'Nouveau client', sub: 'Créer un client', run: () => ctx.setCreatingClient(true) },
      { section: 'Actions', icon: '📅', label: 'Nouveau rappel', sub: 'Ajouter à l\'agenda', run: () => { ctx.setActiveTab('Agenda') } },
      { section: 'Actions', icon: '↻',  label: 'Synchroniser Stripe', sub: 'Recharger les paiements', run: () => ctx.refreshStripe?.() },
      { section: 'Actions', icon: '✏️', label: 'Composer un email', sub: 'Email libre via Brevo', run: () => { ctx.setActiveTab('Emails'); ctx.setEmailTab?.('composer') } },
    );

    // Per-client commands
    (ctx.clients || []).forEach(c => {
      out.push({
        section: 'Clients',
        icon: c.entreprise?.charAt(0)?.toUpperCase() || '·',
        label: c.entreprise,
        sub: `${c.nom} · ${c.statut}`,
        keywords: `${c.nom} ${c.email} ${c.secteur} ${c.tags?.join(' ') || ''}`,
        run: () => ctx.setSelectedClient(c),
      })
      out.push({
        section: 'Actions client',
        icon: '🎬',
        label: `Timeline 360° · ${c.entreprise}`,
        sub: 'Voir tout l\'historique',
        keywords: `${c.entreprise} ${c.nom} timeline`,
        run: () => ctx.setTimelineClient(c),
      })
      if (c.email) out.push({
        section: 'Actions client',
        icon: '📧',
        label: `Envoyer email à ${c.entreprise}`,
        sub: c.email,
        keywords: `${c.entreprise} ${c.nom} email`,
        run: () => ctx.setEmailClient(c),
      })
      out.push({
        section: 'Actions client',
        icon: '🚀',
        label: `Lancer onboarding · ${c.entreprise}`,
        sub: 'Webhook n8n',
        keywords: `${c.entreprise} onboarding n8n`,
        run: async () => {
          await fetch('/api/onboarding/trigger', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ clientId: c.id, triggeredBy: 'cmdk' }),
          })
          ctx.refreshAll?.()
        },
      })
    })

    // System
    out.push({ section: 'Système', icon: '↪', label: 'Déconnexion', sub: 'Fermer la session', run: () => ctx.logout?.() })

    return out
  }, [ctx])

  const filtered = useMemo(() => {
    if (!q.trim()) return commands
    const scored = commands.map(c => {
      const haystack = `${c.label} ${c.sub || ''} ${c.keywords || ''}`
      return { ...c, _score: fuzzyMatch(q, haystack).match ? fuzzyMatch(q, haystack).score : -1 }
    }).filter(c => c._score >= 0)
    scored.sort((a, b) => b._score - a._score)
    return scored
  }, [q, commands])

  useEffect(() => { setActive(0) }, [q])

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, filtered.length - 1)) }
      else if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      else if (e.key === 'Enter')     {
        e.preventDefault()
        const cmd = filtered[active]
        if (cmd) { cmd.run(); onClose() }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, filtered, active, onClose])

  useEffect(() => {
    const el = listRef.current?.querySelector('.cmdk-item.is-active')
    if (el) el.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  // Group filtered by section, preserving order
  const sections = []
  const sectionMap = {}
  filtered.forEach((c, i) => {
    const key = c.section || 'Autres'
    if (!sectionMap[key]) {
      sectionMap[key] = { name: key, items: [] }
      sections.push(sectionMap[key])
    }
    sectionMap[key].items.push({ ...c, _idx: i })
  })

  return (
    <div className="cmdk-backdrop" onClick={onClose}>
      <div className="cmdk-panel" onClick={e => e.stopPropagation()}>
        <div className="cmdk-input-wrap">
          <span style={{ color: 'var(--nerixi-muted)', fontSize: 16 }}>⌕</span>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Tape une action, un nom de client, ou navigue…"
          />
          <span className="kbd" style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--nerixi-border)', borderRadius: 6, padding: '2px 7px' }}>esc</span>
        </div>

        <div className="cmdk-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cmdk-empty">Aucun résultat pour "{q}"</div>
          ) : sections.map(sec => (
            <div key={sec.name}>
              <div className="cmdk-section">{sec.name}</div>
              {sec.items.map(c => (
                <div
                  key={`${sec.name}-${c._idx}`}
                  className={`cmdk-item ${c._idx === active ? 'is-active' : ''}`}
                  onMouseEnter={() => setActive(c._idx)}
                  onClick={() => { c.run(); onClose() }}
                >
                  <span className="icon">{c.icon}</span>
                  <span className="label">{c.label}</span>
                  {c.sub && <span className="sub">{c.sub}</span>}
                  {c._idx === active && <span className="kbd">⏎</span>}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="cmdk-footer">
          <span><span className="kbd">↑↓</span>Naviguer</span>
          <span><span className="kbd">⏎</span>Sélectionner</span>
          <span><span className="kbd">{META_KEY}+K</span>Ouvrir/fermer</span>
        </div>
      </div>
    </div>
  )
}
