'use client'
import { useEffect, useMemo, useRef, useState } from 'react'
import { fireConfetti, playSoftChime } from '@/lib/effects'
import CountUp from './CountUp'

const SLIDE_DURATION = 5500

function buildSlides(stats) {
  const { year, totalClients, newThisYear, totalMRR, totalInstallation, eventsCount, doneCount, onboardingsCount, paymentsCount, paymentsAmount, topSector, topClient } = stats

  return [
    { kind: 'intro', eyebrow: 'Rétrospective', title: `Voici ton année ${year}`, subtitle: 'Toutes tes stats Nerixi en un seul mode story.' },
    { kind: 'big',   eyebrow: 'Clients signés', value: newThisYear, format: v => `+${Math.round(v)}`, subtitle: `nouveaux clients en ${year}`, caption: `Au total : ${totalClients} clients dans ton CRM.` },
    { kind: 'big',   eyebrow: 'MRR généré',     value: totalMRR, format: v => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + '€', subtitle: 'de revenus récurrents par mois', caption: 'Soit ' + new Intl.NumberFormat('fr-FR').format(Math.round(totalMRR * 12)) + '€ projeté sur 12 mois.' },
    { kind: 'big',   eyebrow: 'Trésorerie',     value: totalInstallation, format: v => new Intl.NumberFormat('fr-FR').format(Math.round(v)) + '€', subtitle: 'd\'installations signées', caption: 'Investissement initial accumulé.' },
    { kind: 'big',   eyebrow: 'Rendez-vous',    value: eventsCount, format: v => Math.round(v).toString(), subtitle: 'événements dans ton agenda', caption: `${doneCount} déjà réalisés.` },
    { kind: 'big',   eyebrow: 'Automatisations',value: onboardingsCount, format: v => Math.round(v).toString(), subtitle: 'onboardings n8n déclenchés', caption: 'Ton CRM travaille pendant que tu dors.' },
    ...(paymentsCount > 0 ? [{
      kind: 'big', eyebrow: 'Stripe', value: paymentsCount, format: v => Math.round(v).toString(),
      subtitle: 'paiements encaissés', caption: 'Total : ' + new Intl.NumberFormat('fr-FR').format(Math.round(paymentsAmount / 100)) + '€'
    }] : []),
    ...(topSector ? [{
      kind: 'highlight', eyebrow: 'Secteur dominant', title: topSector.name, subtitle: `${topSector.count} clients · ${new Intl.NumberFormat('fr-FR').format(topSector.mrr)}€/mois`, caption: 'Continue à creuser cette niche.'
    }] : []),
    ...(topClient ? [{
      kind: 'highlight', eyebrow: 'Top client de l\'année', title: topClient.entreprise, subtitle: `${topClient.mrr}€/mois · ${topClient.statut}`, caption: 'À chouchouter en priorité.'
    }] : []),
    { kind: 'final', eyebrow: 'Merci', title: `${year}, c'était bien.`, subtitle: 'Prêt pour la prochaine ?' },
  ]
}

function computeStats(clients, events, stripePayments) {
  const year = new Date().getFullYear()
  const yearStart = new Date(year, 0, 1)

  const totalClients = clients.length
  const newThisYear = clients.filter(c => c.dateDebut && new Date(c.dateDebut) >= yearStart).length
  const totalMRR = clients.filter(c => c.statut !== 'churné').reduce((s, c) => s + (Number(c.mrr) || 0), 0)
  const totalInstallation = clients.filter(c => c.dateDebut && new Date(c.dateDebut) >= yearStart).reduce((s, c) => s + (Number(c.installation) || 0), 0)

  const yearEvents = events.filter(e => e.date >= `${year}-01-01`)
  const eventsCount = yearEvents.length
  const doneCount = yearEvents.filter(e => e.done).length

  const onboardingsCount = clients.filter(c => c.onboarding?.status === 'sent').length

  const yearPayments = stripePayments.filter(p => p.created * 1000 >= yearStart.getTime() && p.status === 'succeeded')
  const paymentsCount = yearPayments.length
  const paymentsAmount = yearPayments.reduce((s, p) => s + (p.amount || 0), 0)

  const sectorAgg = {}
  clients.forEach(c => {
    if (!c.secteur) return
    if (!sectorAgg[c.secteur]) sectorAgg[c.secteur] = { name: c.secteur, count: 0, mrr: 0 }
    sectorAgg[c.secteur].count++
    sectorAgg[c.secteur].mrr += Number(c.mrr) || 0
  })
  const topSector = Object.values(sectorAgg).sort((a, b) => b.count - a.count)[0] || null

  const topClient = [...clients].filter(c => c.statut !== 'churné').sort((a, b) => (b.mrr || 0) - (a.mrr || 0))[0] || null

  return { year, totalClients, newThisYear, totalMRR, totalInstallation, eventsCount, doneCount, onboardingsCount, paymentsCount, paymentsAmount, topSector, topClient }
}

function generatePNG(stats) {
  const canvas = document.createElement('canvas')
  canvas.width = 1080
  canvas.height = 1920
  const ctx = canvas.getContext('2d')

  const grad = ctx.createLinearGradient(0, 0, 0, 1920)
  grad.addColorStop(0, '#0e2148')
  grad.addColorStop(0.6, '#0a1628')
  grad.addColorStop(1, '#06101f')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 1080, 1920)

  // Glow blobs
  const blob = (cx, cy, r, color) => {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
    g.addColorStop(0, color)
    g.addColorStop(1, 'rgba(0,0,0,0)')
    ctx.fillStyle = g
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
  }
  blob(160, 200, 380, 'rgba(0,232,154,0.32)')
  blob(900, 1700, 460, 'rgba(54,230,196,0.22)')
  blob(540, 960, 520, 'rgba(184,156,255,0.10)')

  // Logo
  ctx.font = '900 56px Inter, sans-serif'
  ctx.textAlign = 'center'
  ctx.fillStyle = '#00e89a'
  ctx.fillText('NERIXI', 540, 200)

  ctx.font = '600 24px Inter, sans-serif'
  ctx.fillStyle = '#7a9bb0'
  ctx.fillText(`RÉTROSPECTIVE ${stats.year}`, 540, 250)

  // Big numbers
  const lines = [
    { label: 'CLIENTS SIGNÉS',     value: `+${stats.newThisYear}` },
    { label: 'MRR GÉNÉRÉ',         value: `${new Intl.NumberFormat('fr-FR').format(Math.round(stats.totalMRR))}€` },
    { label: 'INSTALLATIONS',      value: `${new Intl.NumberFormat('fr-FR').format(Math.round(stats.totalInstallation))}€` },
    { label: 'RENDEZ-VOUS',        value: stats.eventsCount.toString() },
    { label: 'AUTOMATISATIONS',    value: stats.onboardingsCount.toString() },
  ]

  let y = 480
  for (const line of lines) {
    ctx.font = '600 22px Inter, sans-serif'
    ctx.fillStyle = '#7a9bb0'
    ctx.fillText(line.label, 540, y)
    y += 50

    ctx.font = '900 88px Inter, sans-serif'
    const numGrad = ctx.createLinearGradient(280, y - 70, 800, y)
    numGrad.addColorStop(0, '#00e89a')
    numGrad.addColorStop(1, '#36e6c4')
    ctx.fillStyle = numGrad
    ctx.fillText(line.value, 540, y)
    y += 130
  }

  // Footer
  ctx.font = '500 22px Inter, sans-serif'
  ctx.fillStyle = '#e8f4f0'
  ctx.fillText('Téo · Fondateur', 540, 1750)
  ctx.font = '500 18px Inter, sans-serif'
  ctx.fillStyle = '#7a9bb0'
  ctx.fillText('nerixi.fr · CRM personnel', 540, 1790)

  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'))
}

export default function YearRecap({ open, onClose, clients, events, stripePayments }) {
  const stats = useMemo(() => computeStats(clients || [], events || [], stripePayments || []), [clients, events, stripePayments])
  const slides = useMemo(() => buildSlides(stats), [stats])
  const [idx, setIdx] = useState(0)
  const timerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    setIdx(0)
    playSoftChime(0.08)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [open])

  useEffect(() => {
    if (!open) return
    if (idx >= slides.length - 1) return
    timerRef.current = setTimeout(() => setIdx(i => i + 1), SLIDE_DURATION)
    return () => clearTimeout(timerRef.current)
  }, [idx, open, slides.length])

  useEffect(() => {
    if (!open) return
    if (idx === slides.length - 1) {
      // final slide → confetti burst
      fireConfetti({ x: window.innerWidth / 2, y: window.innerHeight / 2, count: 140 })
      playSoftChime(0.15)
    } else if (slides[idx]?.kind === 'big') {
      playSoftChime(0.06)
    }
  }, [idx, open])

  const downloadPNG = async () => {
    const blob = await generatePNG(stats)
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `nerixi-recap-${stats.year}.png`
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  if (!open) return null

  const slide = slides[idx]

  return (
    <div className="recap-overlay" onClick={() => idx >= slides.length - 1 ? onClose() : setIdx(i => Math.min(slides.length - 1, i + 1))}>
      <div className="recap-bg" />

      <div className="recap-progress">
        {slides.map((_, i) => (
          <div key={i} className={`recap-progress-bar ${i < idx ? 'is-done' : i === idx ? 'is-active' : ''}`} style={{ '--dur': `${SLIDE_DURATION}ms` }}>
            <div />
          </div>
        ))}
      </div>

      <div className="recap-slide" key={idx} onClick={e => e.stopPropagation()}>
        {slide.eyebrow && <p className="recap-eyebrow">{slide.eyebrow}</p>}

        {slide.kind === 'intro' && (
          <>
            <div className="recap-big">{stats.year}</div>
            <p className="recap-subtitle">{slide.title}</p>
            <p className="recap-caption">{slide.subtitle}</p>
          </>
        )}

        {slide.kind === 'big' && (
          <>
            <div className="recap-big">
              <CountUp value={slide.value} format={slide.format} duration={1800} />
            </div>
            <p className="recap-subtitle">{slide.subtitle}</p>
            {slide.caption && <p className="recap-caption">{slide.caption}</p>}
          </>
        )}

        {slide.kind === 'highlight' && (
          <>
            <p className="recap-subtitle" style={{ fontSize: 'clamp(36px, 8vw, 80px)', fontWeight: 800, marginBottom: 14 }}>{slide.title}</p>
            <p className="recap-caption" style={{ fontSize: 'clamp(15px, 2.5vw, 22px)' }}>{slide.subtitle}</p>
            {slide.caption && <p className="recap-caption" style={{ marginTop: 12 }}>{slide.caption}</p>}
          </>
        )}

        {slide.kind === 'final' && (
          <>
            <div className="recap-big">{stats.year} ✨</div>
            <p className="recap-subtitle">{slide.title}</p>
            <p className="recap-caption">{slide.subtitle}</p>
            <div style={{ marginTop: 28, display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="btn-primary" onClick={downloadPNG}>📥 Télécharger en PNG</button>
              <button onClick={onClose} className="btn-secondary">Fermer</button>
            </div>
          </>
        )}
      </div>

      <div className="recap-controls">
        <button onClick={(e) => { e.stopPropagation(); setIdx(i => Math.max(0, i - 1)) }} disabled={idx === 0}>← Précédent</button>
        <button onClick={(e) => { e.stopPropagation(); onClose() }}>Fermer</button>
        <button onClick={(e) => { e.stopPropagation(); setIdx(i => Math.min(slides.length - 1, i + 1)) }} disabled={idx === slides.length - 1}>Suivant →</button>
      </div>
    </div>
  )
}
