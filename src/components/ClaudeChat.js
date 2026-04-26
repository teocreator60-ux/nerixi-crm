'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { computeHealth, suggestAction } from '@/lib/health'

const HISTORY_KEY = 'nerixi-claude-chat-history'
const MAX_HISTORY = 20

const SYSTEM_PROMPT = `Tu es l'assistant CRM personnel de Téo, fondateur de Nerixi (automatisation IA pour PME et grands comptes en France).

Style :
- Tutoiement direct
- Réponses concises et actionnables (pas de blabla)
- Utilise le format Markdown pour les listes
- Si Téo demande un email, propose un objet + corps
- Si Téo demande une analyse, structure en 3 points max
- Termine toujours par une action concrète à faire

Tu as accès au contexte de son CRM ci-dessous. Base tes réponses dessus.`

const CONTEXTS = [
  { id: 'none',     label: 'Aucun', icon: '∅', desc: 'Question libre, sans données CRM' },
  { id: 'overview', label: 'Vue d\'ensemble', icon: '📊', desc: 'MRR, statuts, top clients' },
  { id: 'all',      label: 'Tous les clients', icon: '👥', desc: 'Liste complète avec MRR/statut' },
  { id: 'risk',     label: 'Clients à risque', icon: '⚠️', desc: 'Health score < 55' },
  { id: 'late',     label: 'Paiements en retard', icon: '⏰', desc: 'Pas de paiement Stripe ce mois' },
  { id: 'urgent',   label: 'Tâches urgentes', icon: '🔥', desc: 'Priorité haute ou en retard' },
  { id: 'one',      label: 'Un client précis', icon: '🎯', desc: 'Toutes les infos d\'un client' },
]

function isLate(client, stripePayments) {
  if (!Number(client.mrr)) return false
  if (!client.email) return false
  const now = new Date()
  const thisKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  const email = client.email.toLowerCase().trim()
  const paid = stripePayments.find(p =>
    p.status === 'succeeded' &&
    (p.customer_email || '').toLowerCase().trim() === email &&
    new Date(p.created * 1000).toISOString().slice(0, 7) === thisKey
  )
  return !paid
}

function fmtClientShort(c) {
  return `- ${c.entreprise} (${c.nom}) · ${c.statut} · ${c.mrr || 0}€/mois · ${c.secteur || '—'}${c.prochainAction ? ` · prochaine action : ${c.prochainAction}` : ''}`
}

function fmtClientFull(c) {
  return [
    `## ${c.entreprise}`,
    `- Contact : ${c.nom}${c.role ? ` (${c.role})` : ''}`,
    c.email     && `- Email : ${c.email}`,
    c.telephone && `- Téléphone : ${c.telephone}`,
    c.linkedin  && `- LinkedIn : ${c.linkedin}`,
    `- Secteur : ${c.secteur || '—'}`,
    `- Statut : ${c.statut}`,
    `- MRR : ${c.mrr || 0}€/mois`,
    c.installation && `- Installation : ${c.installation}€`,
    `- Avancement : ${c.avancement || 0}%`,
    c.dateDebut && `- Date début : ${c.dateDebut}`,
    c.automatisations?.length && `- Automatisations : ${c.automatisations.join(', ')}`,
    c.tags?.length && `- Tags : ${c.tags.join(', ')}`,
    c.prochainAction && `- Prochaine action : ${c.prochainAction}`,
    c.notes && `- Notes : ${c.notes}`,
  ].filter(Boolean).join('\n')
}

function buildContext({ ctxId, clients, stripePayments, events, tasks, oneId }) {
  const today = new Date().toISOString().slice(0, 10)
  const totalMRR = clients.filter(c => c.statut !== 'churné').reduce((s, c) => s + (Number(c.mrr) || 0), 0)
  const counts = clients.reduce((acc, c) => { acc[c.statut] = (acc[c.statut] || 0) + 1; return acc }, {})

  if (ctxId === 'none') return ''

  if (ctxId === 'overview') {
    const top = [...clients].filter(c => c.statut !== 'churné').sort((a, b) => (b.mrr || 0) - (a.mrr || 0)).slice(0, 5)
    return [
      `## Aperçu Nerixi (${today})`,
      `- MRR total : ${totalMRR.toLocaleString('fr-FR')}€/mois`,
      `- Clients : ${clients.length} (${counts.actif || 0} actifs · ${counts['en-cours'] || 0} en cours · ${counts.prospect || 0} prospects · ${counts['churné'] || 0} churnés)`,
      `- Tâches en cours : ${(tasks || []).filter(t => !t.done).length}`,
      `- Événements à venir : ${(events || []).filter(e => e.date >= today && !e.done).length}`,
      ``,
      `## Top 5 clients (par MRR)`,
      ...top.map(fmtClientShort),
    ].join('\n')
  }

  if (ctxId === 'all') {
    return [
      `## Tous mes clients (${clients.length})`,
      ...clients.map(fmtClientShort),
    ].join('\n')
  }

  if (ctxId === 'risk') {
    const risky = clients
      .map(c => ({ c, health: computeHealth(c, { stripePayments, events }) }))
      .filter(x => x.health.score < 55)
      .sort((a, b) => a.health.score - b.health.score)
    if (risky.length === 0) return '## Aucun client à risque actuellement.'
    return [
      `## Clients à risque (${risky.length})`,
      ...risky.map(({ c, health }) => {
        const action = suggestAction(c, health)
        return `- **${c.entreprise}** · score ${health.score}/100 (${health.level}) · ${c.mrr || 0}€/mois — ${action.icon} ${action.text}`
      }),
    ].join('\n')
  }

  if (ctxId === 'late') {
    const late = clients.filter(c => isLate(c, stripePayments))
    if (late.length === 0) return '## Aucun client en retard de paiement ce mois 🎉'
    const total = late.reduce((s, c) => s + (Number(c.mrr) || 0), 0)
    return [
      `## Clients en retard de paiement ce mois (${late.length})`,
      `Total à encaisser : ${total.toLocaleString('fr-FR')}€`,
      ``,
      ...late.map(fmtClientShort),
    ].join('\n')
  }

  if (ctxId === 'urgent') {
    const urgentTasks = (tasks || [])
      .filter(t => !t.done && (t.priority === 'high' || (t.dueDate && t.dueDate <= today)))
      .sort((a, b) => (a.dueDate || '9999').localeCompare(b.dueDate || '9999'))
    if (urgentTasks.length === 0) return '## Aucune tâche urgente.'
    return [
      `## Tâches urgentes (${urgentTasks.length})`,
      ...urgentTasks.map(t => {
        const cli = clients.find(c => c.id === t.clientId)
        const overdue = t.dueDate && t.dueDate < today
        return `- [${t.priority}] **${t.title}**${cli ? ` — ${cli.entreprise}` : ''}${t.dueDate ? ` · échéance ${t.dueDate}${overdue ? ' (RETARD)' : ''}` : ''}`
      }),
    ].join('\n')
  }

  if (ctxId === 'one' && oneId) {
    const c = clients.find(x => x.id === Number(oneId))
    if (!c) return ''
    const cliTasks = (tasks || []).filter(t => t.clientId === c.id)
    const cliEvents = (events || []).filter(e => e.clientId === c.id)
    const cliPays = stripePayments.filter(p => (p.customer_email || '').toLowerCase() === (c.email || '').toLowerCase())
    const health = computeHealth(c, { stripePayments, events })
    return [
      fmtClientFull(c),
      ``,
      `### Score santé : ${health.score}/100 (${health.level})`,
      ``,
      cliTasks.length ? `### Tâches (${cliTasks.length})\n${cliTasks.map(t => `- [${t.priority}]${t.done ? ' ✓' : ''} ${t.title}${t.dueDate ? ` (${t.dueDate})` : ''}`).join('\n')}` : '',
      cliEvents.length ? `### Événements (${cliEvents.length})\n${cliEvents.slice(-10).map(e => `- ${e.date} ${e.time || ''} · ${e.title}${e.done ? ' ✓' : ''}`).join('\n')}` : '',
      cliPays.length ? `### Paiements Stripe (${cliPays.length})\n${cliPays.slice(0, 8).map(p => `- ${new Date(p.created * 1000).toLocaleDateString('fr-FR')} · ${(p.amount / 100).toFixed(0)}€ · ${p.status}`).join('\n')}` : '',
    ].filter(Boolean).join('\n')
  }

  return ''
}

function loadHistory() {
  if (typeof window === 'undefined') return []
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') } catch { return [] }
}

function saveHistory(items) {
  if (typeof window === 'undefined') return
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, MAX_HISTORY))) } catch {}
}

const QUICK_PROMPTS = [
  { icon: '⚠️', text: 'Quels clients sont à risque et que dois-je faire ?', ctx: 'risk' },
  { icon: '⏰', text: 'Rédige les emails de relance pour les paiements en retard.', ctx: 'late' },
  { icon: '📊', text: 'Résume ma situation MRR et donne 3 priorités cette semaine.', ctx: 'overview' },
  { icon: '🔥', text: 'Quelles tâches urgentes je devrais traiter en premier ?', ctx: 'urgent' },
  { icon: '✉️', text: 'Génère un email de point mensuel pour ce client.', ctx: 'one' },
  { icon: '🚀', text: 'Quelle stratégie d\'upsell pour ce client ?', ctx: 'one' },
]

export default function ClaudeChat({ clients = [], stripePayments = [], events = [], tasks = [] }) {
  const [ctxId, setCtxId] = useState('overview')
  const [oneId, setOneId] = useState('')
  const [question, setQuestion] = useState('')
  const [history, setHistory] = useState([])
  const [copied, setCopied] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const taRef = useRef(null)

  useEffect(() => { setHistory(loadHistory()) }, [])

  const ctxText = useMemo(() => buildContext({ ctxId, clients, stripePayments, events, tasks, oneId }), [ctxId, clients, stripePayments, events, tasks, oneId])

  const fullPrompt = useMemo(() => {
    const parts = [SYSTEM_PROMPT]
    if (ctxText) {
      parts.push('---', '# Contexte CRM', ctxText, '---')
    }
    if (question.trim()) parts.push('# Ma question', question.trim())
    return parts.join('\n\n')
  }, [ctxText, question])

  const sendToClause = async () => {
    if (!question.trim()) {
      taRef.current?.focus()
      return
    }
    try {
      await navigator.clipboard.writeText(fullPrompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch {}

    window.open('https://claude.ai/new', '_blank', 'noopener')

    const entry = {
      id: `msg_${Date.now()}`,
      ts: new Date().toISOString(),
      question: question.trim(),
      ctxId,
      oneId: ctxId === 'one' ? oneId : null,
    }
    const next = [entry, ...history].slice(0, MAX_HISTORY)
    setHistory(next)
    saveHistory(next)
  }

  const replay = (entry) => {
    setQuestion(entry.question)
    setCtxId(entry.ctxId)
    if (entry.oneId) setOneId(String(entry.oneId))
    setTimeout(() => taRef.current?.focus(), 50)
  }

  const usePrompt = (p) => {
    setQuestion(p.text)
    if (p.ctx) setCtxId(p.ctx)
    setTimeout(() => taRef.current?.focus(), 50)
  }

  const charCount = fullPrompt.length

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>💬 Chat Claude</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            Pose ta question avec le contexte CRM. Le prompt est copié, Claude.ai s'ouvre, tu colles avec <kbd style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--nerixi-border)', borderRadius: 4, padding: '1px 6px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 11 }}>⌘V</kbd>.
          </p>
        </div>
        <a href="https://claude.ai" target="_blank" rel="noopener" className="btn-secondary" style={{ textDecoration: 'none', padding: '8px 16px', fontSize: 13 }}>
          🚀 Ouvrir Claude.ai
        </a>
      </div>

      <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 18, alignItems: 'flex-start' }}>
        {/* Composer */}
        <div className="card fade-in-up">
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 10 }}>1. Choisis le contexte CRM à inclure</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
            {CONTEXTS.map(c => (
              <button key={c.id} onClick={() => setCtxId(c.id)}
                title={c.desc}
                style={{
                  background: ctxId === c.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.5)',
                  border: `1px solid ${ctxId === c.id ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                  borderRadius: 999, padding: '7px 13px',
                  color: ctxId === c.id ? '#06101f' : 'var(--nerixi-text)',
                  cursor: 'pointer', fontSize: 12, fontWeight: 600,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  transition: 'all 0.15s ease',
                }}>
                <span>{c.icon}</span> {c.label}
              </button>
            ))}
          </div>

          {ctxId === 'one' && (
            <div style={{ marginBottom: 12 }}>
              <label>Client</label>
              <select value={oneId} onChange={e => setOneId(e.target.value)}>
                <option value="">— Choisir un client —</option>
                {[...clients].sort((a, b) => (a.entreprise || '').localeCompare(b.entreprise || '')).map(c => (
                  <option key={c.id} value={c.id}>{c.entreprise} · {c.nom}</option>
                ))}
              </select>
            </div>
          )}

          {ctxText && (
            <div style={{ marginBottom: 14 }}>
              <button onClick={() => setShowPreview(s => !s)}
                style={{ background: 'transparent', border: 'none', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 11, padding: 0, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {showPreview ? '▼' : '▶'} Aperçu du contexte ({(ctxText.length / 100 | 0) / 10}k caractères)
              </button>
              {showPreview && (
                <pre style={{
                  marginTop: 8, padding: 12,
                  background: 'rgba(10,22,40,0.7)',
                  border: '1px solid var(--nerixi-border)',
                  borderRadius: 10,
                  fontSize: 11.5, lineHeight: 1.55,
                  color: 'var(--nerixi-muted)',
                  whiteSpace: 'pre-wrap',
                  maxHeight: 240, overflowY: 'auto',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}>{ctxText}</pre>
              )}
            </div>
          )}

          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginTop: 18, marginBottom: 10 }}>2. Pose ta question</p>
          <textarea
            ref={taRef}
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="Ex: Quels clients sont les plus à risque et que faire en priorité ?"
            rows={5}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); sendToClause() }
            }}
          />
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginTop: 4 }}>
            Astuce : <kbd style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid var(--nerixi-border)', borderRadius: 4, padding: '0 5px', fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10 }}>⌘+⏎</kbd> pour envoyer
          </p>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginTop: 16, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)' }}>
              📝 Prompt total : {charCount.toLocaleString('fr-FR')} caractères
            </p>
            <button onClick={sendToClause} className="btn-primary" disabled={!question.trim()}
              style={{ padding: '11px 22px', fontSize: 14 }}>
              {copied ? '✓ Copié · Claude ouvert' : '📋 Copier & ouvrir Claude'}
            </button>
          </div>
        </div>

        {/* Side: quick prompts + history */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="card fade-in-up">
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 10 }}>⚡ Questions rapides</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {QUICK_PROMPTS.map((p, i) => (
                <button key={i} onClick={() => usePrompt(p)}
                  style={{
                    background: 'rgba(10,22,40,0.5)',
                    border: '1px solid var(--nerixi-border)',
                    borderRadius: 8, padding: '8px 10px',
                    cursor: 'pointer', textAlign: 'left',
                    fontSize: 12, color: 'var(--nerixi-text)',
                    display: 'flex', gap: 8, alignItems: 'flex-start',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--nerixi-green)'; e.currentTarget.style.background = 'rgba(0,200,120,0.06)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nerixi-border)'; e.currentTarget.style.background = 'rgba(10,22,40,0.5)' }}
                >
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{p.icon}</span>
                  <span>{p.text}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="card fade-in-up">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>🕘 Récent</p>
              {history.length > 0 && (
                <button onClick={() => { setHistory([]); saveHistory([]) }}
                  style={{ background: 'transparent', border: 'none', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 11 }}>
                  Effacer
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>Tes questions précédentes apparaîtront ici.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 320, overflowY: 'auto' }}>
                {history.map(h => {
                  const c = CONTEXTS.find(x => x.id === h.ctxId)
                  const t = new Date(h.ts)
                  return (
                    <button key={h.id} onClick={() => replay(h)}
                      style={{
                        background: 'rgba(10,22,40,0.5)',
                        border: '1px solid var(--nerixi-border)',
                        borderRadius: 8, padding: '8px 10px',
                        cursor: 'pointer', textAlign: 'left',
                        fontSize: 12, color: 'var(--nerixi-text)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--nerixi-green)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nerixi-border)' }}
                    >
                      <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>{h.question}</p>
                      <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 2 }}>
                        {c?.icon} {c?.label} · {t.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
