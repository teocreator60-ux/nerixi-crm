'use client'
import Typewriter from './Typewriter'

const VARIANTS = {
  clients:    { svg: 'people',    title: 'Aucun client encore',           sub: 'Crée ton premier client pour démarrer.' },
  prospects:  { svg: 'telescope', title: 'Personne dans le pipeline',     sub: 'Scanne une carte ou importe un CSV.' },
  inbox:      { svg: 'envelope',  title: 'Boîte de réception vide',       sub: 'Tes emails reçus apparaîtront ici dès que tu configures Brevo Inbound.' },
  pipeline:   { svg: 'target',    title: 'Pipeline vide',                  sub: 'Ajoute un prospect ou drag & drop depuis Prospection.' },
  agenda:     { svg: 'calendar',  title: 'Aucun rappel',                   sub: 'Ajoute ton premier rappel ou rendez-vous.' },
  workflows:  { svg: 'gear',      title: 'Aucune automatisation',          sub: 'Crée ton premier workflow pour automatiser le CRM.' },
  visitors:   { svg: 'radar',     title: 'Aucun visiteur',                 sub: 'Colle le snippet sur nerixi.fr pour commencer.' },
  payments:   { svg: 'wallet',    title: 'Aucun paiement Stripe',          sub: 'Tes transactions Stripe apparaîtront ici.' },
  linkedin:   { svg: 'spark',     title: 'Aucune publication encore',      sub: 'Génère ton premier post via n8n.' },
  tasks:      { svg: 'checklist', title: 'Aucune tâche',                   sub: 'Tout est sous contrôle ✨' },
  emails:     { svg: 'mailstack', title: 'Aucun template HTML',            sub: 'Crée des templates riches comme dans Brevo.' },
  attachments:{ svg: 'paperclip', title: 'Aucun fichier',                  sub: 'Glisse un PDF, image ou contrat ici.' },
  generic:    { svg: 'cloud',     title: 'Rien à afficher pour l\'instant', sub: '' },
}

function Svg({ name }) {
  const C1 = '#00e89a'
  const C2 = '#36e6c4'
  const C3 = '#6cb6f5'
  const C4 = '#fac775'
  const C5 = '#b89cff'

  if (name === 'people') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-people" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C2} /></linearGradient>
      </defs>
      <g className="empty-float">
        <circle cx="100" cy="76" r="28" fill="url(#g-people)" opacity="0.85" />
        <ellipse cx="100" cy="150" rx="56" ry="34" fill="url(#g-people)" opacity="0.45" />
      </g>
      <g className="empty-twinkle"  ><circle cx="40" cy="50" r="3" fill={C1} /></g>
      <g className="empty-twinkle-2"><circle cx="160" cy="40" r="2.5" fill={C2} /></g>
      <g className="empty-twinkle-3"><circle cx="170" cy="120" r="2" fill={C1} /></g>
    </svg>
  )

  if (name === 'telescope') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-tele" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C2} /><stop offset="1" stopColor={C3} /></linearGradient>
      </defs>
      <g transform="translate(100 110)" className="empty-scan">
        <rect x="-12" y="-50" width="24" height="76" rx="6" fill="url(#g-tele)" />
        <rect x="-22" y="-58" width="44" height="14" rx="6" fill={C2} />
        <rect x="-7" y="26" width="14" height="22" fill={C3} opacity="0.6" />
      </g>
      <line x1="100" y1="170" x2="60" y2="190" stroke={C2} strokeWidth="2" opacity="0.5" />
      <line x1="100" y1="170" x2="140" y2="190" stroke={C2} strokeWidth="2" opacity="0.5" />
      <g className="empty-twinkle"  ><circle cx="35" cy="40" r="3" fill={C1} /></g>
      <g className="empty-twinkle-2"><circle cx="170" cy="55" r="2.5" fill={C4} /></g>
      <g className="empty-twinkle-3"><circle cx="55" cy="80" r="2" fill={C2} /></g>
      <g className="empty-twinkle"  ><circle cx="155" cy="100" r="2.5" fill={C5} /></g>
    </svg>
  )

  if (name === 'envelope') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-env" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C2} /></linearGradient>
      </defs>
      <g className="empty-float">
        <rect x="40" y="68" width="120" height="76" rx="10" fill="url(#g-env)" opacity="0.9" />
        <path d="M40 78 L100 120 L160 78" stroke="#06101f" strokeWidth="3" fill="none" />
      </g>
      <circle cx="160" cy="68" r="10" fill={C4} className="empty-blink" />
      <g className="empty-twinkle"><circle cx="30" cy="50" r="2" fill={C1} /></g>
      <g className="empty-twinkle-2"><circle cx="170" cy="160" r="2.5" fill={C2} /></g>
    </svg>
  )

  if (name === 'target') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <radialGradient id="g-tgt"><stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C2} stopOpacity="0.4" /></radialGradient>
      </defs>
      <g className="empty-float">
        <circle cx="100" cy="100" r="60" fill="none" stroke={C2} strokeWidth="3" opacity="0.4" />
        <circle cx="100" cy="100" r="42" fill="none" stroke={C1} strokeWidth="3" opacity="0.6" />
        <circle cx="100" cy="100" r="22" fill="url(#g-tgt)" />
      </g>
      <g className="empty-orbit" style={{ transformOrigin: '100px 100px' }}>
        <circle cx="100" cy="30" r="4" fill={C4} />
      </g>
      <g className="empty-twinkle"><circle cx="35" cy="55" r="2.5" fill={C3} /></g>
      <g className="empty-twinkle-3"><circle cx="170" cy="160" r="2" fill={C5} /></g>
    </svg>
  )

  if (name === 'calendar') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-cal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C2} /><stop offset="1" stopColor={C1} /></linearGradient>
      </defs>
      <g className="empty-float">
        <rect x="40" y="50" width="120" height="110" rx="10" fill="url(#g-cal)" opacity="0.88" />
        <rect x="40" y="50" width="120" height="22" fill="#06101f" opacity="0.4" />
        <rect x="56" y="40" width="6" height="20" rx="2" fill={C1} />
        <rect x="138" y="40" width="6" height="20" rx="2" fill={C1} />
        <text x="100" y="125" fontFamily="sans-serif" fontWeight="700" fontSize="42" fill="#06101f" textAnchor="middle">7</text>
      </g>
      <g className="empty-twinkle-2"><circle cx="30" cy="35" r="2" fill={C4} /></g>
    </svg>
  )

  if (name === 'gear') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-gear" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C5} /></linearGradient>
      </defs>
      <g className="empty-orbit" style={{ transformOrigin: '100px 100px' }}>
        <path d="M100 36 L108 48 L122 44 L120 60 L132 70 L120 80 L122 96 L108 92 L100 104 L92 92 L78 96 L80 80 L68 70 L80 60 L78 44 L92 48 Z"
          transform="translate(0 30) scale(1.5) translate(-100 -70)" fill="url(#g-gear)" />
        <circle cx="100" cy="100" r="14" fill="#06101f" />
      </g>
    </svg>
  )

  if (name === 'radar') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <radialGradient id="g-rad"><stop offset="0" stopColor={C1} stopOpacity="0.5" /><stop offset="1" stopColor={C2} stopOpacity="0" /></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="76" fill="url(#g-rad)" />
      <circle cx="100" cy="100" r="48" fill="none" stroke={C1} strokeWidth="1.5" opacity="0.4" />
      <circle cx="100" cy="100" r="76" fill="none" stroke={C1} strokeWidth="1.5" opacity="0.25" />
      <line x1="100" y1="100" x2="100" y2="24" stroke={C1} strokeWidth="2" opacity="0.6" className="empty-orbit" style={{ transformOrigin: '100px 100px' }} />
      <circle cx="100" cy="100" r="5" fill={C1} />
      <g className="empty-twinkle"  ><circle cx="55"  cy="65"  r="3"   fill={C4} /></g>
      <g className="empty-twinkle-2"><circle cx="148" cy="120" r="2.5" fill={C3} /></g>
      <g className="empty-twinkle-3"><circle cx="125" cy="55"  r="2"   fill={C5} /></g>
    </svg>
  )

  if (name === 'wallet') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-wal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C2} /></linearGradient>
      </defs>
      <g className="empty-float">
        <rect x="40" y="64" width="120" height="80" rx="12" fill="url(#g-wal)" opacity="0.9" />
        <rect x="120" y="92" width="48" height="24" rx="4" fill="#06101f" opacity="0.5" />
        <circle cx="148" cy="104" r="6" fill={C4} />
      </g>
      <g className="empty-twinkle"><circle cx="40" cy="48" r="2" fill={C1} /></g>
      <g className="empty-twinkle-3"><circle cx="170" cy="160" r="2.5" fill={C2} /></g>
    </svg>
  )

  if (name === 'spark') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-spk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C1} /><stop offset="0.5" stopColor={C2} /><stop offset="1" stopColor={C5} /></linearGradient>
      </defs>
      <g className="empty-twinkle" style={{ transformOrigin: '100px 100px' }}>
        <path d="M100 30 L110 90 L170 100 L110 110 L100 170 L90 110 L30 100 L90 90 Z" fill="url(#g-spk)" />
      </g>
      <g className="empty-twinkle-2"><circle cx="40" cy="50" r="3" fill={C1} /></g>
      <g className="empty-twinkle-3"><circle cx="160" cy="50" r="2.5" fill={C4} /></g>
    </svg>
  )

  if (name === 'checklist') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-chk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C2} /><stop offset="1" stopColor={C1} /></linearGradient>
      </defs>
      <g className="empty-float">
        <rect x="50" y="45" width="100" height="110" rx="10" fill="url(#g-chk)" opacity="0.88" />
        <rect x="62" y="60" width="20" height="6" fill="#06101f" opacity="0.5" />
        <path d="M62 80 L72 90 L88 72" stroke="#06101f" strokeWidth="3" fill="none" />
        <rect x="92" y="78" width="50" height="6" fill="#06101f" opacity="0.5" />
        <path d="M62 110 L72 120 L88 102" stroke="#06101f" strokeWidth="3" fill="none" />
        <rect x="92" y="108" width="40" height="6" fill="#06101f" opacity="0.5" />
        <rect x="62" y="138" width="6" height="6" fill="#06101f" opacity="0.4" />
        <rect x="76" y="138" width="60" height="6" fill="#06101f" opacity="0.3" />
      </g>
    </svg>
  )

  if (name === 'mailstack') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-stk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C1} /><stop offset="1" stopColor={C2} /></linearGradient>
      </defs>
      <g className="empty-float">
        <rect x="35" y="92" width="120" height="68" rx="8" fill="url(#g-stk)" opacity="0.6" transform="rotate(-4 95 126)" />
        <rect x="40" y="80" width="120" height="68" rx="8" fill="url(#g-stk)" opacity="0.78" />
        <rect x="48" y="64" width="120" height="68" rx="8" fill="url(#g-stk)" opacity="0.95" transform="rotate(3 108 98)" />
      </g>
    </svg>
  )

  if (name === 'paperclip') return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-clip" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C2} /><stop offset="1" stopColor={C1} /></linearGradient>
      </defs>
      <g className="empty-drift">
        <path d="M70 50 q15 -15 30 0 l40 40 q-12 12 -24 0 l-30 -30 q-6 -6 0 -12 t12 0 l24 24"
          stroke="url(#g-clip)" strokeWidth="8" fill="none" strokeLinecap="round" />
      </g>
    </svg>
  )

  // cloud / generic
  return (
    <svg viewBox="0 0 200 200">
      <defs>
        <linearGradient id="g-cloud" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={C2} /><stop offset="1" stopColor={C1} /></linearGradient>
      </defs>
      <g className="empty-float">
        <ellipse cx="100" cy="110" rx="60" ry="28" fill="url(#g-cloud)" opacity="0.88" />
        <circle cx="76" cy="100" r="22" fill="url(#g-cloud)" opacity="0.88" />
        <circle cx="124" cy="96" r="28" fill="url(#g-cloud)" opacity="0.88" />
      </g>
    </svg>
  )
}

export default function EmptyState({ variant = 'generic', title, subtitle, action }) {
  const v = VARIANTS[variant] || VARIANTS.generic
  return (
    <div className="empty-state fade-in">
      <Svg name={v.svg} />
      <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--nerixi-text)', minHeight: '1.4em' }}>
        <Typewriter text={title || v.title} speed={32} startDelay={150} />
      </p>
      {(subtitle || v.sub) && <p style={{ fontSize: 12.5, maxWidth: 340 }}>{subtitle || v.sub}</p>}
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  )
}
