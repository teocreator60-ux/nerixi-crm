'use client'
import { useState, useEffect, useMemo } from 'react'
import Login, { useAuth } from '@/components/Login'
import Calendar from '@/components/Calendar'
import { MRRChart, ClientGrowthChart, StatusBreakdown, MRRForecastChart, CohortHeatmap, LTVCard } from '@/components/Charts'
import ClientForm from '@/components/ClientForm'
import PaymentTracking from '@/components/PaymentTracking'
import CommandPalette from '@/components/CommandPalette'
import Kanban from '@/components/Kanban'
import { AtRiskPanel, HealthGauge, ClientHealthCard } from '@/components/HealthScore'
import ClientTimeline from '@/components/ClientTimeline'
import { RealtimeToastStack } from '@/components/RealtimeToast'
import CountUp from '@/components/CountUp'
import YearRecap from '@/components/YearRecap'
import { fireConfettiFromElement, playChaching, isSoundEnabled, setSoundEnabled, fireGoldRain, fireStarBurst, fireFireworks, fireCheckmark } from '@/lib/effects'
import AmbientBackground from '@/components/AmbientBackground'
import EmptyState from '@/components/EmptyState'
import { SkelClientCard, SkelStatsGrid, SkelGrid } from '@/components/Skeleton'
import InlineEdit from '@/components/InlineEdit'
import Attachments from '@/components/Attachments'
import { apiFetch } from '@/lib/apiFetch'
import { TaskList, UrgentTasksPanel } from '@/components/Tasks'
import Prospection from '@/components/Prospection'
import ClaudeChat from '@/components/ClaudeChat'
import OnboardingChecklist from '@/components/OnboardingChecklist'
import generateMonthlyReport from '@/components/MonthlyReport'
import EmailTemplateEditor from '@/components/EmailTemplateEditor'
import ListsManager from '@/components/ListsManager'
import Composer from '@/components/Composer'
import LinkedinGenerator from '@/components/LinkedinGenerator'
import Pipeline from '@/components/Pipeline'
import Inbox from '@/components/Inbox'
import PaymentLinkButton from '@/components/PaymentLink'
import VisitorPanel from '@/components/VisitorPanel'
import Sequences from '@/components/Sequences'
import Quotes from '@/components/Quotes'
import CursorLight from '@/components/CursorLight'
import { useGlobalRipple, useRevealOnScroll, useTilt3D } from '@/lib/interactions'

const TABS = [
  { id: 'Dashboard',   icon: '📊' },
  { id: 'Pipeline',    icon: '🎯' },
  { id: 'Prospection', icon: '📥' },
  { id: 'Clients',     icon: '👥' },
  { id: 'Agenda',      icon: '📅' },
  { id: 'Suivi',       icon: '💰', label: 'Suivi paiements' },
  { id: 'Stripe',      icon: '💳', label: 'Stripe' },
  { id: 'Chat',        icon: '💬' },
  { id: 'Emails',      icon: '📧' },
  { id: 'Sequences',   icon: '⏱',  label: 'Séquences' },
  { id: 'Devis',       icon: '📄' },
  { id: 'LinkedIn',    icon: '💼' },
]

const LINKEDIN_TEMPLATES = [
  {
    id: 1,
    titre: "Publication résultat client",
    contenu: `🚀 Résultat client de la semaine

Un de nos clients dans le secteur commerce vient de récupérer 23 000€ de chiffre d'affaires en 3 mois grâce à l'automatisation de ses relances devis.

Ce n'est pas de la magie. C'est de l'automatisation bien faite.

Avant : ses commerciaux oubliaient de relancer. Des devis dormaient pendant des semaines.

Après : chaque devis non signé déclenche automatiquement une relance à J+1, puis une notification commerciale à J+2.

Résultat : 12 devis convertis sur 47 relances envoyées.

Vous voulez savoir combien vous perdez chaque mois en devis oubliés ?

→ Audit gratuit sur nerixi.fr

#Automatisation #IA #PME #CRM #Nerixi`
  },
  {
    id: 2,
    titre: "Post éducatif automatisation",
    contenu: `💡 3 tâches que toute PME peut automatiser cette semaine (sans compétences techniques)

1. Les relances devis
Combien de devis traînent dans votre boite mail sans réponse ? Un simple système de relance automatique à J+1 et J+3 peut transformer votre taux de conversion.

2. La ressaisie comptable
Vos équipes passent des heures à copier des données d'un outil à l'autre. C'est automatisable en quelques jours.

3. Les rapports hebdomadaires
Fini les tableaux Excel manuels. Un dashboard automatique vous donne vos KPIs en temps réel.

Combien d'heures par semaine perdez-vous sur ces 3 points ?

Faites le calcul. Ensuite appelez-nous.

→ nerixi.fr | Audit gratuit en 30 minutes

#Automatisation #GainDeTemps #PME #IA #Nerixi`
  },
  {
    id: 3,
    titre: "Post accroche dirigeant",
    contenu: `J'ai rencontré un dirigeant de 150 salariés la semaine dernière.

Il passait 2 heures par jour au téléphone avec ses équipes pour savoir où en étaient leurs missions.

2 heures. Tous les jours. Depuis 12 ans.

Ça représente 10 heures par semaine. 40 heures par mois. Une semaine entière de travail.

On a automatisé ça en 3 semaines.

Maintenant il consulte un dashboard en 30 secondes le matin.

Les 40 heures récupérées ? Il les passe à développer son business.

Vous avez une tâche qui vous vole du temps comme ça ?

Dites-la moi en commentaire. Je vous dis si c'est automatisable.

#Dirigeant #Automatisation #IA #Productivité #Nerixi`
  }
]

const EMAIL_TEMPLATES = [
  {
    id: 1,
    titre: "Rapport mensuel client",
    sujet: "Votre rapport mensuel Nerixi — {mois}",
    contenu: `<p>Bonjour {prenom},</p>
<p>Voici votre rapport mensuel pour le mois de <strong>{mois}</strong>.</p>
<hr class="divider">
<p><strong>📊 Résumé de vos automatisations :</strong></p>
<ul style="padding-left:20px;line-height:2">
  <li>Automatisations actives : <strong>{nb_automatisations}</strong></li>
  <li>Temps économisé estimé : <strong>{temps_economise}h/mois</strong></li>
  <li>Prochaine action : <strong>{prochaine_action}</strong></li>
</ul>
<hr class="divider">
<p>N'hésitez pas à me contacter pour toute question.</p>
<p>Cordialement,<br><strong>Téo</strong><br>Fondateur — Nerixi</p>`
  },
  {
    id: 2,
    titre: "Relance prospect",
    sujet: "Suite à notre échange — Nerixi",
    contenu: `<p>Bonjour {prenom},</p>
<p>Suite à notre échange, je voulais revenir vers vous avec quelques éléments concrets.</p>
<p>En quelques semaines, nos clients automatisent en moyenne <strong>8 à 15 heures de travail répétitif par semaine</strong>.</p>
<p>Seriez-vous disponible pour un appel de 20 minutes cette semaine pour voir ce que l'on pourrait faire ensemble ?</p>
<p>Je reste disponible du mardi au vendredi.</p>
<p>Cordialement,<br><strong>Téo</strong><br>Fondateur — Nerixi</p>`
  },
  {
    id: 3,
    titre: "Bienvenue nouveau client",
    sujet: "Bienvenue chez Nerixi — Prochaines étapes",
    contenu: `<p>Bonjour {prenom},</p>
<p>Bienvenue chez Nerixi ! Je suis ravi de vous compter parmi nos clients.</p>
<p>Voici les prochaines étapes :</p>
<ol style="padding-left:20px;line-height:2">
  <li><strong>Cette semaine</strong> — Analyse de vos processus actuels</li>
  <li><strong>Semaine 2</strong> — Conception de vos automatisations</li>
  <li><strong>Semaine 3-4</strong> — Développement et tests</li>
  <li><strong>Livraison</strong> — Formation et mise en production</li>
</ol>
<p>Je vous contacte dans les 48h pour fixer notre premier rendez-vous.</p>
<p>À très vite,<br><strong>Téo</strong><br>Fondateur — Nerixi</p>`
  }
]

const STATUS_LABEL = {
  succeeded: { label: 'Réussi',   color: '#00e89a', bg: 'rgba(0,200,120,0.14)',  border: 'rgba(0,200,120,0.3)'  },
  pending:   { label: 'En attente', color: '#fac775', bg: 'rgba(250,199,117,0.14)', border: 'rgba(250,199,117,0.3)' },
  failed:    { label: 'Échoué',   color: '#ff8a89', bg: 'rgba(226,75,74,0.14)',  border: 'rgba(226,75,74,0.3)'  },
  refunded:  { label: 'Remboursé', color: '#b89cff', bg: 'rgba(160,130,250,0.14)', border: 'rgba(160,130,250,0.3)' },
}

function formatMoney(cents, currency = 'eur') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100)
  } catch {
    return `${((cents || 0) / 100).toFixed(2)} ${currency.toUpperCase()}`
  }
}

function formatDate(unix) {
  const d = new Date(unix * 1000)
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) + ' · ' +
         d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

function StatCard({ label, value, sub, icon, dataAttr }) {
  return (
    <div className="card fade-in-up glow-border" {...(dataAttr ? { 'data-stat': dataAttr } : {})} style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(0,200,120,0.12), transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{label}</p>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <p className="grad-text" style={{ fontSize: 30, fontWeight: 800, letterSpacing: -0.5 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function ClientCard({ client, onClick, onEdit }) {
  const onb = client.onboarding
  const tiltRef = useTilt3D({ max: 4, scale: 1.015 })
  return (
    <div ref={tiltRef} className="card card-hover fade-in-up tilt-3d" onClick={() => onClick(client)} style={{ position: 'relative' }}>
      <button onClick={(e) => { e.stopPropagation(); onEdit(client) }}
        style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 8, background: 'rgba(255,255,255,0.04)', border: '1px solid var(--nerixi-border)', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s ease' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,200,120,0.15)'; e.currentTarget.style.color = 'var(--nerixi-accent)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--nerixi-muted)' }}
        title="Modifier">✎</button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, paddingRight: 36 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,200,120,0.25), rgba(54,230,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--nerixi-accent)', border: '1px solid var(--nerixi-border)' }}>
            {client.nom.charAt(0)}
          </div>
          <div>
            <p style={{ fontWeight: 600, fontSize: 15, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {client.nom}
              {onb?.status === 'sent' && <span title={`Onboarding lancé · ${new Date(onb.triggeredAt).toLocaleDateString('fr-FR')}`} style={{ fontSize: 11 }}>🚀</span>}
            </p>
            <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)' }}>{client.entreprise}</p>
          </div>
        </div>
        <span className={`badge-${client.statut}`}>{client.statut}</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 14 }}>
        <span style={{ color: 'var(--nerixi-muted)' }}>{client.secteur}</span>
        <span style={{ color: 'var(--nerixi-accent)', fontWeight: 700 }}>{client.mrr}€<span style={{ color: 'var(--nerixi-muted)', fontWeight: 400 }}>/mois</span></span>
      </div>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--nerixi-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.4 }}>
          <span>Avancement</span>
          <span>{client.avancement}%</span>
        </div>
        <div className="progress-bar">
          <div style={{ width: `${client.avancement}%` }} />
        </div>
      </div>
    </div>
  )
}

function ClientDetail({ client, onClose, onEmail, onEdit, onOnboarding, onTimeline, stripePayments, events, tasks, onCreateTask, onUpdateTask, onDeleteTask, onClientPatch }) {
  const [onboardingState, setOnboardingState] = useState({ loading: false, error: '', success: false })

  const triggerOnboarding = async () => {
    setOnboardingState({ loading: true, error: '', success: false })
    try {
      const res = await fetch('/api/onboarding/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: client.id, triggeredBy: 'manual' }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur n8n')
      setOnboardingState({ loading: false, error: '', success: true })
      if (data.client) onOnboarding?.(data.client)
      setTimeout(() => setOnboardingState(s => ({ ...s, success: false })), 4000)
    } catch (e) {
      setOnboardingState({ loading: false, error: e.message, success: false })
    }
  }

  const onb = client.onboarding

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="card modal-card" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close">✕</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'linear-gradient(135deg, var(--nerixi-green), var(--nerixi-accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, fontWeight: 800, color: '#06101f', boxShadow: '0 8px 22px rgba(0,200,120,0.35)' }}>
            {client.nom.charAt(0)}
          </div>
          <div style={{ flex: 1 }}>
            <p style={{ fontWeight: 700, fontSize: 19 }}>{client.nom}</p>
            <p style={{ color: 'var(--nerixi-muted)', fontSize: 13 }}>{client.entreprise} · {client.secteur}</p>
          </div>
          <span className={`badge-${client.statut}`}>{client.statut}</span>
        </div>

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 18 }}>
          <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>MRR</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--nerixi-accent)', marginTop: 4 }}>
              <InlineEdit value={client.mrr || 0} type="number" hint={false}
                displayFormat={v => `${v}€`}
                onSave={async (v) => { await onClientPatch?.(client.id, { mrr: Number(v) || 0 }) }} />
            </p>
          </div>
          <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Installation</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--nerixi-accent)', marginTop: 4 }}>
              <InlineEdit value={client.installation || 0} type="number" hint={false}
                displayFormat={v => `${v}€`}
                onSave={async (v) => { await onClientPatch?.(client.id, { installation: Number(v) || 0 }) }} />
            </p>
          </div>
          <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Avancement</p>
            <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--nerixi-accent)', marginTop: 4 }}>
              <InlineEdit value={client.avancement || 0} type="number" hint={false}
                displayFormat={v => `${v}%`}
                onSave={async (v) => { await onClientPatch?.(client.id, { avancement: Number(v) || 0 }) }} />
            </p>
          </div>
        </div>

        <div style={{ marginBottom: 18 }}>
          <ClientHealthCard client={client} stripePayments={stripePayments || []} events={events || []} />
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>📋 Tâches</p>
          <TaskList
            tasks={(tasks || []).filter(t => t.clientId === client.id)}
            clients={[client]}
            onCreate={onCreateTask}
            onUpdate={onUpdateTask}
            onDelete={onDeleteTask}
            showClient={false}
            defaultClientId={client.id}
            emptyText="Aucune tâche pour ce client."
          />
        </div>

        <div style={{ marginBottom: 18, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 14 }}>
          <OnboardingChecklist
            client={client}
            onUpdate={async (next) => {
              await onClientPatch?.(client.id, { onboardingChecklist: next.onboardingChecklist })
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Contact</p>
          {client.email && <p style={{ fontSize: 14 }}>📧 <a href={`mailto:${client.email}`} style={{ color: 'var(--nerixi-accent)' }}>{client.email}</a></p>}
          {client.telephone && <p style={{ fontSize: 14, marginTop: 4 }}>📞 {client.telephone}</p>}
          {client.linkedin && <p style={{ fontSize: 14, marginTop: 4 }}>💼 <a href={client.linkedin} target="_blank" style={{ color: 'var(--nerixi-accent)' }}>Voir profil LinkedIn</a></p>}
        </div>

        {client.automatisations?.length > 0 && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Automatisations</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {client.automatisations.map((a, i) => (
                <span key={i} style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid var(--nerixi-border)', borderRadius: 999, padding: '5px 12px', fontSize: 12 }}>{a}</span>
              ))}
            </div>
          </div>
        )}

        {client.notes && (
          <div style={{ marginBottom: 18 }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Notes</p>
            <p style={{ fontSize: 14, lineHeight: 1.6 }}>{client.notes}</p>
          </div>
        )}

        <div style={{ background: 'linear-gradient(120deg, rgba(0,200,120,0.12), rgba(54,230,196,0.06))', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 14, marginBottom: 18 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Prochaine action</p>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--nerixi-accent)', marginTop: 4 }}>
            → <InlineEdit value={client.prochainAction || ''} hint={false}
              placeholder="Définir une prochaine action..."
              onSave={async (v) => { await onClientPatch?.(client.id, { prochainAction: v }) }} />
          </p>
        </div>

        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600, marginBottom: 8 }}>📎 Pièces jointes</p>
          <Attachments clientId={client.id} />
        </div>

        <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 14, marginBottom: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 10, flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>🚀 Onboarding · n8n</p>
              {onb?.status === 'sent' ? (
                <p style={{ fontSize: 12.5, color: 'var(--nerixi-accent)', marginTop: 4 }}>
                  Lancé le {new Date(onb.triggeredAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              ) : onb?.status === 'failed' ? (
                <p style={{ fontSize: 12.5, color: '#ff8a89', marginTop: 4 }}>Dernière tentative échouée — {onb.error}</p>
              ) : (
                <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginTop: 4 }}>Pas encore déclenché</p>
              )}
            </div>
            <button onClick={triggerOnboarding} disabled={onboardingState.loading}
              style={{
                background: onb?.status === 'sent' ? 'rgba(10,22,40,0.6)' : 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))',
                border: onb?.status === 'sent' ? '1px solid var(--nerixi-border)' : 'none',
                color: onb?.status === 'sent' ? 'var(--nerixi-text)' : '#06101f',
                borderRadius: 10, padding: '9px 16px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                opacity: onboardingState.loading ? 0.6 : 1,
                transition: 'all 0.2s ease'
              }}>
              {onboardingState.loading ? <><span className="spinner" /> &nbsp;Envoi…</> : (onb?.status === 'sent' ? '↻ Relancer' : 'Lancer l\'onboarding')}
            </button>
          </div>
          {onboardingState.success && <p className="fade-in" style={{ fontSize: 12, color: 'var(--nerixi-accent)' }}>✅ Workflow n8n déclenché avec succès</p>}
          {onboardingState.error && <p className="fade-in" style={{ fontSize: 12, color: '#ff8a89' }}>⚠ {onboardingState.error}</p>}
        </div>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <PaymentLinkButton client={client} />
          <button className="btn-secondary" onClick={() => onEmail(client)} style={{ flex: 1, minWidth: 130 }}>
            ✉️ Email
          </button>
          <button onClick={() => onEdit(client)} className="btn-secondary" style={{ flex: 1, minWidth: 130 }}>
            ✎ Modifier
          </button>
          <button onClick={() => onTimeline?.(client)} className="btn-secondary" style={{ flex: 1, minWidth: 130 }}>
            🎬 Timeline 360°
          </button>
          {client.linkedin && (
            <a href={client.linkedin} target="_blank" className="btn-secondary" style={{ flex: 1, minWidth: 130, textAlign: 'center', textDecoration: 'none' }}>
              LinkedIn
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function EmailModal({ client, onClose, customTemplates = [] }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [sujet, setSujet] = useState('')
  const [contenu, setContenu] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const applyTemplate = (template) => {
    const prenom = client.nom.split(' ')[0]
    const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    setSujet(template.sujet.replace('{prenom}', prenom).replace('{mois}', mois))
    setContenu(template.contenu
      .replace(/{prenom}/g, prenom)
      .replace(/{mois}/g, mois)
      .replace(/{nb_automatisations}/g, client.automatisations?.length || 0)
      .replace(/{temps_economise}/g, '12')
      .replace(/{prochaine_action}/g, client.prochainAction || '')
    )
    setSelectedTemplate(template.id)
  }

  const sendEmail = async () => {
    if (!sujet || !contenu) return
    setSending(true)
    setError('')
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: client.email, toName: client.nom, subject: sujet, content: contenu })
      })
      const data = await res.json()
      if (data.success) {
        setSent(true)
        setTimeout(onClose, 2000)
      } else {
        setError(data.error || 'Erreur lors de l\'envoi')
      }
    } catch (e) {
      setError('Erreur réseau')
    }
    setSending(false)
  }

  return (
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 155 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close">✕</button>
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Email à {client.nom}</p>
        <p style={{ fontSize: 13, color: 'var(--nerixi-muted)', marginBottom: 22 }}>{client.email}</p>

        <div style={{ marginBottom: 18 }}>
          <label>Template rapide</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EMAIL_TEMPLATES.map(t => (
              <button key={`std-${t.id}`} onClick={() => applyTemplate(t)}
                style={{
                  background: selectedTemplate === `std-${t.id}` ? 'rgba(0,200,120,0.15)' : 'rgba(10,22,40,0.6)',
                  border: `1px solid ${selectedTemplate === `std-${t.id}` ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                  borderRadius: 10, padding: '11px 14px', color: 'var(--nerixi-text)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  transition: 'all 0.2s ease'
                }}>
                {selectedTemplate === `std-${t.id}` ? '✓ ' : '○ '}{t.titre}
              </button>
            ))}
            {customTemplates.length > 0 && <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginTop: 8 }}>🎨 Mes templates HTML</p>}
            {customTemplates.map(t => (
              <button key={`custom-${t.id}`} onClick={() => {
                const prenom = client.nom.split(' ')[0]
                const mois = new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
                const fillVars = (s) => (s || '').replace(/{(\w+)}/g, (m, k) => ({
                  prenom, nom: client.nom, entreprise: client.entreprise || '', email: client.email || '', mois, mrr: client.mrr || 0,
                }[k] ?? m))
                setSujet(fillVars(t.subject))
                setContenu(fillVars(t.html))
                setSelectedTemplate(`custom-${t.id}`)
              }}
                style={{
                  background: selectedTemplate === `custom-${t.id}` ? 'rgba(0,200,120,0.15)' : 'rgba(10,22,40,0.6)',
                  border: `1px solid ${selectedTemplate === `custom-${t.id}` ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                  borderRadius: 10, padding: '11px 14px', color: 'var(--nerixi-text)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  transition: 'all 0.2s ease',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                {selectedTemplate === `custom-${t.id}` ? '✓' : '🎨'} {t.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label>Objet</label>
          <input value={sujet} onChange={e => setSujet(e.target.value)} placeholder="Objet de l'email..." />
        </div>

        <div style={{ marginBottom: 16 }}>
          <label>Contenu (HTML accepté)</label>
          <textarea value={contenu} onChange={e => setContenu(e.target.value)} placeholder="Contenu de l'email..." rows={8} style={{ resize: 'vertical' }} />
        </div>

        {error && <p className="fade-in" style={{ color: '#ff8a89', fontSize: 13, marginBottom: 12 }}>⚠ {error}</p>}
        {sent && <p className="fade-in" style={{ color: 'var(--nerixi-accent)', fontSize: 13, marginBottom: 12 }}>✅ Email envoyé avec succès !</p>}

        <button className="btn-primary" onClick={sendEmail} disabled={sending || !sujet || !contenu} style={{ width: '100%' }}>
          {sending ? <><span className="spinner" /> &nbsp;Envoi en cours…</> : 'Envoyer via Brevo'}
        </button>
      </div>
    </div>
  )
}

function StripeView({ payments, mode, onRefresh, onSimulate }) {
  const [filter, setFilter] = useState('all')
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    try { await onRefresh?.() } finally { setRefreshing(false) }
  }

  const filtered = filter === 'all' ? payments : payments.filter(p => p.status === filter)
  const totals = payments.reduce((acc, p) => {
    if (p.status === 'succeeded') acc.gross += p.amount
    if (p.status === 'refunded')  acc.refunded += p.amount
    if (p.status === 'pending')   acc.pending += p.amount
    return acc
  }, { gross: 0, refunded: 0, pending: 0 })
  const net = totals.gross - totals.refunded

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>💳 Paiements Stripe</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            {mode === 'live' ? `${payments.length} paiements synchronisés` : `Mode démo · ajoute STRIPE_SECRET_KEY`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: mode === 'live' ? 'rgba(0,200,120,0.14)' : 'rgba(250,199,117,0.14)',
            border: `1px solid ${mode === 'live' ? 'rgba(0,200,120,0.3)' : 'rgba(250,199,117,0.3)'}`,
            color: mode === 'live' ? '#00e89a' : '#fac775',
            padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor', boxShadow: '0 0 8px currentColor' }} />
            {mode === 'live' ? 'LIVE' : 'DÉMO'}
          </span>
          <button onClick={load} className="btn-secondary" disabled={refreshing} style={{ padding: '8px 16px', fontSize: 13 }}>
            {refreshing ? <><span className="spinner" /> &nbsp;Sync…</> : '↻ Actualiser'}
          </button>
          {onSimulate && (
            <button onClick={onSimulate} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
              🎲 Simuler un paiement
            </button>
          )}
        </div>
      </div>

      <div className="grid-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard label="Encaissé total"     value={formatMoney(totals.gross)}    sub={`${payments.filter(p => p.status === 'succeeded').length} réussis`} icon="💰" />
        <StatCard label="Net après remb."    value={formatMoney(net)}             sub={`-${formatMoney(totals.refunded)} remboursés`} icon="📈" />
        <StatCard label="En attente"         value={formatMoney(totals.pending)}  sub={`${payments.filter(p => p.status === 'pending').length} paiements`} icon="⏳" />
        <StatCard label="Total transactions" value={payments.length}              sub="Tous statuts" icon="🧾" />
      </div>

      <div style={{ display: 'inline-flex', gap: 4, marginBottom: 18, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
        {[
          { id: 'all',       label: 'Tous' },
          { id: 'succeeded', label: 'Réussis' },
          { id: 'pending',   label: 'En attente' },
          { id: 'failed',    label: 'Échoués' },
          { id: 'refunded',  label: 'Remboursés' },
        ].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            style={{
              background: filter === f.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
              border: 'none', borderRadius: 8, padding: '7px 16px',
              color: filter === f.id ? '#06101f' : 'var(--nerixi-muted)',
              cursor: 'pointer', fontWeight: 600, fontSize: 12.5, transition: 'all 0.2s ease'
            }}>{f.label}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
          <p style={{ fontSize: 32, marginBottom: 8 }}>💳</p>
          <p>Aucun paiement</p>
        </div>
      ) : (
        <div className="card fade-in-up" style={{ padding: 0, overflow: 'hidden' }}>
          {filtered.map((p, i) => {
            const s = STATUS_LABEL[p.status] || { label: p.status, color: 'var(--nerixi-muted)', bg: 'rgba(255,255,255,0.05)', border: 'var(--nerixi-border)' }
            return (
              <div key={p.id} className="fade-in-up"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.4fr 1.6fr 0.8fr 0.6fr',
                  padding: '14px 20px',
                  borderBottom: i === filtered.length - 1 ? 'none' : '1px solid var(--nerixi-border)',
                  fontSize: 13, alignItems: 'center', gap: 10,
                  animationDelay: `${Math.min(i * 0.03, 0.4)}s`,
                }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg, rgba(0,200,120,0.25), rgba(54,230,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--nerixi-accent)', fontSize: 12, flexShrink: 0 }}>
                    {(p.customer_name || p.customer_email || '?').charAt(0).toUpperCase()}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.customer_name || '—'}</p>
                    <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.customer_email || formatDate(p.created)}</p>
                  </div>
                </div>
                <div className="table-mobile-hide" style={{ minWidth: 0 }}>
                  <p style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.description}</p>
                  <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', fontFamily: 'ui-monospace, monospace', marginTop: 2 }}>{p.id}</p>
                </div>
                <p style={{ textAlign: 'right', fontWeight: 700, color: p.status === 'refunded' || p.status === 'failed' ? 'var(--nerixi-muted)' : 'var(--nerixi-accent)', textDecoration: p.status === 'refunded' ? 'line-through' : 'none' }}>
                  {formatMoney(p.amount, p.currency)}
                </p>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    display: 'inline-block',
                    background: s.bg, color: s.color, border: `1px solid ${s.border}`,
                    borderRadius: 999, padding: '3px 10px', fontSize: 11.5, fontWeight: 600,
                  }}>{s.label}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const { authed, login, logout } = useAuth()
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [emailClient, setEmailClient] = useState(null)
  const [editingClient, setEditingClient] = useState(null)
  const [creatingClient, setCreatingClient] = useState(false)
  const [timelineClient, setTimelineClient] = useState(null)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [recapOpen, setRecapOpen] = useState(false)
  const [toasts, setToasts] = useState([])
  const [rtConnected, setRtConnected] = useState(false)
  const [soundOn, setSoundOnState] = useState(true)
  const [copiedId, setCopiedId] = useState(null)
  const [emailTab, setEmailTab] = useState('templates')
  const [emailTo, setEmailTo] = useState('')
  const [emailSujet, setEmailSujet] = useState('')
  const [emailContenu, setEmailContenu] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const [clients, setClients] = useState([])
  const [events, setEvents] = useState([])
  const [tasks, setTasks] = useState([])
  const [emailTemplates, setEmailTemplates] = useState([])
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [lists, setLists] = useState([])
  const [linkedinPosts, setLinkedinPosts] = useState([])
  const [prospects, setProspects] = useState([])
  const [stripePayments, setStripePayments] = useState([])
  const [stripeMode, setStripeMode] = useState('demo')
  const [loadingData, setLoadingData] = useState(true)

  const stats = useMemo(() => ({
    mrr_total: clients.filter(c => c.statut === 'actif' || c.statut === 'en-cours').reduce((s, c) => s + (Number(c.mrr) || 0), 0),
    installation_total: clients.reduce((s, c) => s + (Number(c.installation) || 0), 0),
    clients_actifs: clients.filter(c => c.statut === 'actif').length,
    clients_en_cours: clients.filter(c => c.statut === 'en-cours').length,
  }), [clients])

  const refreshData = async () => {
    try {
      const [cRes, eRes, sRes, tRes, tplRes, lRes, liRes, prRes] = await Promise.all([
        apiFetch('/api/clients',         { cache: 'no-store' }),
        apiFetch('/api/events',          { cache: 'no-store' }),
        apiFetch('/api/stripe/payments', { cache: 'no-store' }),
        apiFetch('/api/tasks',           { cache: 'no-store' }),
        apiFetch('/api/email-templates', { cache: 'no-store' }),
        apiFetch('/api/lists',           { cache: 'no-store' }),
        apiFetch('/api/linkedin/posts',  { cache: 'no-store' }),
        apiFetch('/api/prospects',       { cache: 'no-store' }),
      ])
      const c = await cRes.json()
      const e = await eRes.json()
      const s = await sRes.json()
      const t = await tRes.json()
      const tpl = await tplRes.json()
      const ll = await lRes.json()
      const li = await liRes.json()
      const pr = await prRes.json()
      setClients(c.clients || [])
      setEvents(e.events || [])
      setStripePayments(s.payments || [])
      setStripeMode(s.mode || 'demo')
      setTasks(t.tasks || [])
      setEmailTemplates(tpl.templates || [])
      setLists(ll.lists || [])
      setLinkedinPosts(li.posts || [])
      setProspects(pr.prospects || [])
    } catch (e) {}
    setLoadingData(false)
  }

  const handleListSaved = (saved) => {
    setLists(prev => {
      const idx = prev.findIndex(l => l.id === saved.id)
      if (idx === -1) return [...prev, saved]
      const next = [...prev]; next[idx] = saved
      return next
    })
  }
  const handleListDeleted = (id) => setLists(prev => prev.filter(l => l.id !== id))

  const handleTemplateSaved = (saved) => {
    setEmailTemplates(prev => {
      const idx = prev.findIndex(t => t.id === saved.id)
      if (idx === -1) return [...prev, saved]
      const next = [...prev]; next[idx] = saved
      return next
    })
  }
  const handleTemplateDeleted = (id) => {
    setEmailTemplates(prev => prev.filter(t => t.id !== id))
  }

  const createTask = async (payload) => {
    const res = await fetch('/api/tasks', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (data.task) setTasks(prev => [...prev, data.task])
    return data.task
  }
  const updateTaskFn = async (id, patch) => {
    const before = tasks.find(t => t.id === id)
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...patch } : t))
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    })
    const data = await res.json()
    if (data.task) setTasks(prev => prev.map(t => t.id === id ? data.task : t))
    // Confetti checkmark si tâche haute priorité passée à done
    if (before && !before.done && patch.done && before.priority === 'high') {
      fireCheckmark()
    }
  }
  const deleteTaskFn = async (id) => {
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' })
    setTasks(prev => prev.filter(t => t.id !== id))
  }

  const importProspectAsClient = async (data) => {
    const res = await fetch('/api/clients', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    const result = await res.json()
    if (result.client) handleClientSaved(result.client)
    return result.client
  }

  const refreshStripe = async () => {
    try {
      const res = await fetch('/api/stripe/payments', { cache: 'no-store' })
      const data = await res.json()
      setStripePayments(data.payments || [])
      setStripeMode(data.mode || 'demo')
    } catch {}
  }

  useEffect(() => {
    if (authed) refreshData()
  }, [authed])

  useEffect(() => {
    if (!authed) return
    const handler = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        setPaletteOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [authed])

  useEffect(() => { setSoundOnState(isSoundEnabled()) }, [])

  // Animations globales
  useGlobalRipple()
  useRevealOnScroll([activeTab, clients.length])

  const pushToast = (toast) => {
    const id = `t_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`
    setToasts(prev => [...prev.slice(-4), { id, ...toast }])
  }
  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  useEffect(() => {
    if (!authed) return
    const es = new EventSource('/api/realtime/stream')
    es.onopen = () => setRtConnected(true)
    es.onerror = () => setRtConnected(false)
    es.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data)
        handleRealtimeEvent(data)
      } catch {}
    }
    return () => { es.close() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed])

  const handleRealtimeEvent = (data) => {
    if (data.type === 'connected') return

    if (data.type === 'payment.received') {
      const p = data.payment || {}
      const c = data.client || {}
      pushToast({
        kind: 'success',
        icon: '💰',
        title: c.entreprise ? `Paiement de ${c.entreprise}` : 'Paiement reçu',
        amount: p.amount,
        sub: data.source === 'simulated' ? 'Simulation · ' + (c.nom || 'client inconnu') : (c.nom || p.customer_email || 'Stripe'),
      })
      // Detect first payment ever for this client → gold rain
      const isFirstPayment = c.id && stripePayments.filter(x => {
        const email = (x.customer_email || '').toLowerCase()
        return x.status === 'succeeded' && email && c.email && email === c.email.toLowerCase()
      }).length === 0
      // Detect MRR milestone (multiple of 10k €)
      const newMRR = (stats.mrr_total || 0) + (Number(c.mrr) || 0)
      const milestones = [10000, 25000, 50000, 100000, 250000]
      const crossedMilestone = milestones.find(m => stats.mrr_total < m && newMRR >= m)

      if (isFirstPayment) {
        fireGoldRain({ duration: 3500 })
      } else if (crossedMilestone) {
        fireStarBurst({ count: 80 })
      } else {
        const mrrEl = document.querySelector('[data-stat="mrr"]')
        if (mrrEl) fireConfettiFromElement(mrrEl, { count: 110 })
        else fireConfettiFromElement(null, { count: 110 })
      }
      if (isSoundEnabled()) playChaching()
      // refresh stripe + clients to update charts/MRR
      refreshStripe()
      return
    }
    if (data.type === 'payment.failed') {
      const c = data.client || {}
      pushToast({
        kind: 'fail', icon: '⚠️',
        title: 'Paiement échoué', amount: data.payment?.amount,
        sub: c.entreprise || data.payment?.customer_email || 'Stripe',
      })
      refreshStripe()
      return
    }
    if (data.type === 'payment.refunded') {
      const c = data.client || {}
      pushToast({
        kind: 'refund', icon: '↩️',
        title: 'Remboursement', amount: data.payment?.amount,
        sub: c.entreprise || 'Stripe',
      })
      refreshStripe()
      return
    }
    if (data.type === 'visitor.hot') {
      const pv = data.pageview || {}
      const cli = pv.clientId ? clients.find(c => c.id === pv.clientId) : null
      pushToast({
        kind: 'success', icon: '🔥',
        title: cli ? `${cli.entreprise} est sur ${pv.title || pv.url}` : `Visiteur identifié sur une page chaude`,
        sub: pv.url,
      })
    }
  }

  const simulatePayment = async (clientId) => {
    try {
      await fetch('/api/realtime/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(clientId ? { clientId } : {}),
      })
    } catch {}
  }

  const toggleSound = () => {
    const next = !soundOn
    setSoundOnState(next)
    setSoundEnabled(next)
    if (next) playChaching(0.1)
  }

  const changeClientStatus = async (client, newStatus) => {
    setClients(prev => prev.map(c => c.id === client.id ? { ...c, statut: newStatus } : c))
    try {
      const res = await fetch(`/api/clients/${client.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...client, statut: newStatus }),
      })
      const data = await res.json()
      if (data.client) handleClientSaved(data.client)
      if (newStatus === 'actif' && client.statut !== 'actif') {
        fireFireworks({ bursts: 4 })
        if (isSoundEnabled()) playChaching(0.12)
      }
    } catch {
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, statut: client.statut } : c))
    }
  }

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const [regeneratingId, setRegeneratingId] = useState(null)
  const [regenStatus, setRegenStatus] = useState({})
  const [regenContent, setRegenContent] = useState({}) // { [templateId]: 'new content' }

  const regenerateLinkedIn = async (template) => {
    setRegeneratingId(template.id)
    setRegenStatus(s => ({ ...s, [template.id]: null }))
    try {
      const res = await fetch('/api/linkedin/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: template.titre,
          topic: template.titre,
          currentContent: regenContent[template.id] || template.contenu,
        }),
      })
      const data = await res.json()
      if (res.ok && data.success && data.content) {
        setRegenContent(c => ({ ...c, [template.id]: data.content }))
        setRegenStatus(s => ({ ...s, [template.id]: { ok: true } }))
      } else {
        setRegenStatus(s => ({ ...s, [template.id]: { ok: false, msg: data.error || 'Pas de contenu retourné' } }))
      }
    } catch (e) {
      setRegenStatus(s => ({ ...s, [template.id]: { ok: false, msg: e.message } }))
    }
    setRegeneratingId(null)
    setTimeout(() => setRegenStatus(s => { const c = { ...s }; delete c[template.id]; return c }), 4000)
  }

  const resetRegenerated = (id) => {
    setRegenContent(c => { const n = { ...c }; delete n[id]; return n })
  }

  const sendDirectEmail = async () => {
    if (!emailTo || !emailSujet || !emailContenu) return
    setSending(true)
    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: emailTo, subject: emailSujet, content: `<p>${emailContenu.replace(/\n/g, '<br>')}</p>` })
      })
      const data = await res.json()
      if (data.success) { setSent(true); setTimeout(() => setSent(false), 3000) }
    } catch (e) {}
    setSending(false)
  }

  const handleClientSaved = (saved) => {
    setClients(prev => {
      const idx = prev.findIndex(c => c.id === saved.id)
      if (idx === -1) return [...prev, saved]
      const next = [...prev]; next[idx] = saved
      return next
    })
  }
  const handleClientDeleted = (id) => {
    setClients(prev => prev.filter(c => c.id !== id))
    setSelectedClient(null)
  }

  const createEvent = async (payload) => {
    const res = await fetch('/api/events', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json()
    if (data.event) setEvents(prev => [...prev, data.event])
  }
  const updateEvent = async (id, patch) => {
    const res = await fetch(`/api/events/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch) })
    const data = await res.json()
    if (data.event) setEvents(prev => prev.map(e => e.id === id ? data.event : e))
  }
  const deleteEvent = async (id) => {
    await fetch(`/api/events/${id}`, { method: 'DELETE' })
    setEvents(prev => prev.filter(e => e.id !== id))
  }

  if (authed === null) return <div style={{ minHeight: '100vh' }} />
  if (!authed) return <Login onLogin={login} />

  const today = new Date().toISOString().slice(0, 10)
  const todayEvents = events.filter(e => e.date === today && !e.done)

  const handleNavClick = (id) => {
    setActiveTab(id)
    setSidebarOpen(false)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }} className="fade-in">
      <CursorLight />
      <button className="mobile-toggle" onClick={() => setSidebarOpen(s => !s)} aria-label="Menu">
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'is-open' : ''}`} style={{
        width: 230,
        background: 'linear-gradient(180deg, rgba(17,31,56,0.95), rgba(10,22,40,0.95))',
        borderRight: '1px solid var(--nerixi-border)',
        display: 'flex', flexDirection: 'column',
        padding: '22px 0',
        flexShrink: 0,
        backdropFilter: 'blur(8px)',
        position: 'sticky', top: 0, height: '100vh'
      }}>
        <div style={{ padding: '4px 22px 18px', borderBottom: '1px solid var(--nerixi-border)', marginBottom: 14 }}>
          <img src="/logo-nerixi.jpg" alt="Nerixi" className="logo-breathe" style={{ width: '100%', maxWidth: 160, height: 'auto', display: 'block', marginBottom: 6 }} />
          <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>CRM Dashboard</p>
        </div>

        <div className="sidebar-tabs" style={{ display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div
            className="sidebar-tab-indicator"
            style={{
              top: TABS.findIndex(t => t.id === activeTab) * 46 + 8,
              height: 30,
              opacity: TABS.findIndex(t => t.id === activeTab) >= 0 ? 1 : 0,
            }}
          />
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              onClick={() => handleNavClick(tab.id)}
              className={`tab-btn slide-in-left ${activeTab === tab.id ? 'active' : ''}`}
              style={{ animationDelay: `${i * 0.04}s` }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              {tab.label || tab.id}
            </button>
          ))}
        </div>

        <button onClick={() => setPaletteOpen(true)}
          style={{
            margin: '12px 16px 0', padding: '8px 12px',
            background: 'rgba(0,200,120,0.06)',
            border: '1px solid var(--nerixi-border)',
            borderRadius: 10,
            color: 'var(--nerixi-muted)',
            cursor: 'pointer',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--nerixi-green)'; e.currentTarget.style.color = 'var(--nerixi-text)' }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nerixi-border)'; e.currentTarget.style.color = 'var(--nerixi-muted)' }}
          title="Ouvrir la palette de commandes">
          <span>⌕ Recherche rapide</span>
          <span style={{ fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 10.5, background: 'rgba(255,255,255,0.05)', padding: '1px 6px', borderRadius: 4 }}>⌘K</span>
        </button>

        <div style={{ marginTop: 'auto', padding: '18px 22px', borderTop: '1px solid var(--nerixi-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--nerixi-green), var(--nerixi-accent-2))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#06101f',
              flexShrink: 0,
              boxShadow: '0 6px 18px rgba(0,200,120,0.45), inset 0 0 16px rgba(255,255,255,0.15)',
            }}>T</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--nerixi-text)' }}>Téo</p>
              <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>info@nerixi.com</p>
            </div>
          </div>
          <button onClick={logout}
            style={{
              width: '100%',
              background: 'transparent',
              border: '1px solid var(--nerixi-border)',
              color: 'var(--nerixi-muted)',
              borderRadius: 8,
              padding: '7px 10px',
              fontSize: 12,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#e24b4a'; e.currentTarget.style.color = '#ff8a89' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--nerixi-border)'; e.currentTarget.style.color = 'var(--nerixi-muted)' }}
          >
            ↪ Déconnexion
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content page-transition" style={{ flex: '1 1 0%', padding: '24px 20px', overflowY: 'auto', overflowX: 'hidden', minWidth: 0, position: 'relative' }} key={activeTab}>
        {activeTab === 'Dashboard' && <AmbientBackground density={28} />}
        <div style={{ position: 'relative', zIndex: 1, width: '100%', minWidth: 0 }}>

        {loadingData && (
          <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 30, fontSize: 11.5, color: 'var(--nerixi-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="spinner" /> Synchronisation…
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === 'Dashboard' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, gap: 14, flexWrap: 'wrap' }}>
              <div>
                <h1 className="h1-page grad-text" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Tableau de bord</h1>
                <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>Vue d'ensemble de ton activité Nerixi</p>
              </div>
              <div className="dash-actions">
                <span className={`live-dot ${rtConnected ? '' : 'is-off'}`}>{rtConnected ? 'Live' : 'Hors ligne'}</span>
                <button onClick={toggleSound} title={soundOn ? 'Désactiver le son' : 'Activer le son'}
                  style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: '8px 12px', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 14 }}>
                  {soundOn ? '🔊' : '🔇'}
                </button>
                <button onClick={() => generateMonthlyReport({ clients, events, stripePayments })} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                  📊 Rapport mensuel
                </button>
                <button onClick={() => simulatePayment()} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                  🎲 Simuler un paiement
                </button>
                <button onClick={() => setRecapOpen(true)} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                  🎬 Rétrospective {new Date().getFullYear()}
                </button>
              </div>
            </div>

            {todayEvents.length > 0 && (
              <div className="card fade-in-up" style={{ marginBottom: 22, background: 'linear-gradient(120deg, rgba(0,200,120,0.12), rgba(54,230,196,0.04))', borderColor: 'rgba(0,200,120,0.3)', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 22 }}>🔔</span>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <p style={{ fontWeight: 700, fontSize: 14 }}>{todayEvents.length} rappel{todayEvents.length > 1 ? 's' : ''} aujourd'hui</p>
                  <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginTop: 2 }}>
                    {todayEvents.slice(0, 3).map(e => `${e.time} ${e.title}`).join(' · ')}{todayEvents.length > 3 ? ' …' : ''}
                  </p>
                </div>
                <button onClick={() => setActiveTab('Agenda')} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }}>Voir l'agenda</button>
              </div>
            )}

            <div className="grid-auto-stats reveal reveal-stagger" style={{ marginBottom: 22 }}>
              <StatCard
                label="MRR Total"
                value={<CountUp value={stats.mrr_total} format={v => `${Math.round(v).toLocaleString('fr-FR')}€`} />}
                sub="Revenus récurrents/mois"
                icon="💰"
                dataAttr="mrr"
              />
              <StatCard label="Trésorerie"    value={<CountUp value={stats.installation_total} format={v => `${Math.round(v).toLocaleString('fr-FR')}€`} />} sub="Total installations signées" icon="🏦" />
              <StatCard label="Clients actifs" value={<CountUp value={stats.clients_actifs} />}                                                                   sub={`+ ${stats.clients_en_cours} en cours`} icon="🚀" />
            </div>

            <div className="reveal" style={{ marginBottom: 22 }}>
              <MRRChart clients={clients} />
            </div>

            <div className="grid-auto-lg reveal" style={{ marginBottom: 22 }}>
              <MRRForecastChart clients={clients} />
              <LTVCard clients={clients} />
            </div>

            <div className="grid-auto-md reveal" style={{ marginBottom: 22 }}>
              <CohortHeatmap clients={clients} />
              <StatusBreakdown clients={clients} />
            </div>

            <div className="reveal" style={{ marginBottom: 22 }}>
              <ClientGrowthChart clients={clients} />
            </div>

            <div className="grid-auto-md reveal" style={{ marginBottom: 22 }}>
              <UrgentTasksPanel
                tasks={tasks} clients={clients}
                onUpdate={updateTaskFn} onDelete={deleteTaskFn}
                onSelectClient={setSelectedClient}
              />
              <AtRiskPanel clients={clients} stripePayments={stripePayments} events={events}
                onSelect={setSelectedClient} />
            </div>

            <div className="reveal" style={{ marginBottom: 22 }}>
              <VisitorPanel clients={clients} onSelectClient={setSelectedClient} />
            </div>

            <div className="reveal" style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Clients récents</h2>
              <div className="grid-auto-cards reveal-stagger">
                {clients.slice(0, 4).map(c => (
                  <ClientCard key={c.id} client={c} onClick={setSelectedClient} onEdit={setEditingClient} />
                ))}
              </div>
            </div>
          </div>
        )}

        {/* CLIENTS */}
        {activeTab === 'Clients' && (
          <div className="fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12, flexWrap: 'wrap' }}>
              <div>
                <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Clients</h1>
                <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>{clients.length} clients · clique pour voir le détail, ✎ pour modifier</p>
              </div>
              <button className="btn-primary" onClick={() => setCreatingClient(true)}>+ Nouveau client</button>
            </div>
            <div className="grid-2 stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
              {clients.map(c => <ClientCard key={c.id} client={c} onClick={setSelectedClient} onEdit={setEditingClient} />)}
            </div>
            {clients.length === 0 && loadingData && (
              <SkelGrid count={4} columns={2} />
            )}
            {clients.length === 0 && !loadingData && (
              <EmptyState variant="clients" action={
                <button className="btn-primary" onClick={() => setCreatingClient(true)}>+ Créer le premier client</button>
              } />
            )}
          </div>
        )}

        {/* PIPELINE (prospects + clients) */}
        {activeTab === 'Pipeline' && (
          <div className="fade-in">
            <div style={{ marginBottom: 20 }}>
              <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>🎯 Pipeline complet</h1>
              <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
                Top of funnel (prospects) → Bottom of funnel (clients). Drag & drop pour faire avancer chaque deal.
              </p>
            </div>

            <Pipeline
              prospects={prospects}
              onProspectsChange={(updater) => setProspects(updater)}
              onConvertToClient={(client) => { handleClientSaved(client) }}
            />

            {/* Visual flow separator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '34px 0 22px', position: 'relative' }}>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,200,120,0.3), rgba(0,200,120,0.3), transparent)' }} />
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '8px 16px',
                background: 'linear-gradient(120deg, rgba(0,200,120,0.10), rgba(54,230,196,0.05))',
                border: '1px solid rgba(0,200,120,0.3)',
                borderRadius: 999,
                fontSize: 11.5, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase',
                color: 'var(--nerixi-accent)',
              }}>
                <span>🎯 Prospect signé</span>
                <span style={{ fontSize: 14 }}>↓</span>
                <span>👥 Devient client</span>
              </div>
              <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(0,200,120,0.3), rgba(0,200,120,0.3), transparent)' }} />
            </div>

            <div style={{ marginBottom: 18 }}>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>📌 Suite — pipeline clients</p>
              <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginTop: 4 }}>
                Une fois signé, le prospect rentre ici. Drag entre Prospect → En cours → Actif → Churné. Chaque transition déclenche le webhook n8n configuré.
              </p>
            </div>

            <Kanban
              clients={clients}
              onChangeStatus={changeClientStatus}
              onOpenClient={setSelectedClient}
              onTimeline={setTimelineClient}
              onConvertProspect={async (prospectId, statut) => {
                try {
                  const res = await fetch(`/api/prospects/${prospectId}/convert`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ statut }),
                  })
                  const data = await res.json()
                  if (data.client) {
                    handleClientSaved(data.client)
                    setProspects(prev => prev.filter(p => p.id !== prospectId))
                  }
                } catch (e) {}
              }}
            />
          </div>
        )}

        {/* PROSPECTION */}
        {activeTab === 'Prospection' && (
          <Prospection
            onImport={importProspectAsClient}
          />
        )}

        {/* CHAT CLAUDE */}
        {activeTab === 'Chat' && (
          <ClaudeChat
            clients={clients}
            stripePayments={stripePayments}
            events={events}
            tasks={tasks}
          />
        )}

        {/* AGENDA */}
        {activeTab === 'Agenda' && (
          <Calendar
            events={events}
            clients={clients}
            onCreate={createEvent}
            onUpdate={updateEvent}
            onDelete={deleteEvent}
          />
        )}

        {/* SUIVI PAIEMENTS */}
        {activeTab === 'Suivi' && (
          <PaymentTracking
            clients={clients}
            stripePayments={stripePayments}
            stripeMode={stripeMode}
            onRefresh={refreshStripe}
          />
        )}

        {/* STRIPE */}
        {activeTab === 'Stripe' && (
          <StripeView
            payments={stripePayments}
            mode={stripeMode}
            onRefresh={refreshStripe}
            onSimulate={() => simulatePayment()}
          />
        )}

        {/* EMAILS */}
        {activeTab === 'Emails' && (
          <div className="fade-in">
            <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>📧 Emails</h1>
            <p style={{ color: 'var(--nerixi-muted)', marginBottom: 22 }}>Envoie des emails à tes clients via Brevo</p>

            <div style={{ display: 'inline-flex', gap: 4, marginBottom: 22, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 4, flexWrap: 'wrap' }}>
              {[
                { id: 'inbox',     label: '📥 Inbox' },
                { id: 'composer',  label: '✏️ Composer' },
                { id: 'html',      label: '🎨 Templates HTML' },
                { id: 'lists',     label: '📋 Listes' },
                { id: 'templates', label: 'Templates rapides' },
              ].map(t => (
                <button key={t.id} onClick={() => setEmailTab(t.id)}
                  style={{
                    background: emailTab === t.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
                    border: 'none', borderRadius: 8, padding: '8px 18px',
                    color: emailTab === t.id ? '#06101f' : 'var(--nerixi-muted)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s ease'
                  }}>
                  {t.label}
                </button>
              ))}
            </div>

            {emailTab === 'templates' && (
              <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {EMAIL_TEMPLATES.map(t => (
                  <div key={t.id} className="card card-hover fade-in-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700 }}>{t.titre}</p>
                      <p style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>{t.sujet}</p>
                    </div>
                    <div style={{ background: 'rgba(10,22,40,0.6)', borderRadius: 10, padding: 12, fontSize: 13, color: 'var(--nerixi-muted)', lineHeight: 1.6, marginBottom: 12, maxHeight: 80, overflow: 'hidden' }}
                      dangerouslySetInnerHTML={{ __html: t.contenu.replace(/<[^>]+>/g, ' ').substring(0, 150) + '...' }} />
                    <p style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>→ Utilise ce template depuis la fiche client</p>
                  </div>
                ))}
              </div>
            )}

            {emailTab === 'html' && (
              <div className="fade-in">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <p style={{ fontSize: 14, color: 'var(--nerixi-muted)' }}>Crée des templates HTML complets avec variables — comme dans Brevo.</p>
                  <button onClick={() => setEditingTemplate({})} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
                    + Nouveau template HTML
                  </button>
                </div>

                {emailTemplates.length === 0 ? (
                  <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
                    <p style={{ fontSize: 32, marginBottom: 8 }}>🎨</p>
                    <p>Aucun template HTML.</p>
                    <button onClick={() => setEditingTemplate({})} className="btn-primary" style={{ marginTop: 16 }}>+ Créer mon premier template</button>
                  </div>
                ) : (
                  <div className="grid-2 stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                    {emailTemplates.map(t => (
                      <div key={t.id} className="card card-hover fade-in-up" onClick={() => setEditingTemplate(t)}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(0,200,120,0.25), rgba(54,230,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🎨</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ fontWeight: 700, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.name}</p>
                            <p style={{ fontSize: 11.5, color: 'var(--nerixi-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.subject || '(sans sujet)'}</p>
                          </div>
                        </div>
                        <div style={{ background: '#ffffff', borderRadius: 8, padding: 0, height: 140, overflow: 'hidden', border: '1px solid var(--nerixi-border)', position: 'relative' }}>
                          <iframe
                            srcDoc={t.html}
                            title={t.name}
                            sandbox=""
                            style={{ width: 600, height: 700, border: 'none', transform: 'scale(0.4)', transformOrigin: 'top left', pointerEvents: 'none' }}
                          />
                        </div>
                        <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 8 }}>
                          Modifié le {new Date(t.updatedAt || t.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {emailTab === 'inbox' && (
              <Inbox
                clients={clients}
                onSelectClient={setSelectedClient}
                onCompose={(prefill) => setEmailClient({ id: 0, nom: prefill.toName || prefill.to, email: prefill.to, entreprise: prefill.toName || '', _prefillSubject: prefill.subject })}
              />
            )}

            {emailTab === 'composer' && (
              <Composer
                clients={clients}
                lists={lists}
                emailTemplates={emailTemplates}
              />
            )}

            {emailTab === 'lists' && (
              <ListsManager
                clients={clients}
                lists={lists}
                onSaved={handleListSaved}
                onDeleted={handleListDeleted}
              />
            )}
          </div>
        )}

        {/* SEQUENCES */}
        {activeTab === 'Sequences' && (
          <div className="fade-in">
            <Sequences clients={clients} />
          </div>
        )}

        {/* DEVIS */}
        {activeTab === 'Devis' && (
          <div className="fade-in">
            <Quotes clients={clients} prospects={prospects} />
          </div>
        )}

        {/* LINKEDIN */}
        {activeTab === 'LinkedIn' && (
          <div className="fade-in">
            <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>💼 LinkedIn</h1>
            <p style={{ color: 'var(--nerixi-muted)', marginBottom: 22 }}>Génère des publications LinkedIn via n8n (TOFU, BOFU, planning, hooks, carrousel, recyclage)</p>

            <LinkedinGenerator posts={linkedinPosts} onPostsChange={(updater) => setLinkedinPosts(updater)} />

            <div style={{ marginTop: 32, paddingTop: 24, borderTop: '1px solid var(--nerixi-border)' }}>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 14 }}>📚 Templates de référence (statiques)</p>
            </div>

            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {LINKEDIN_TEMPLATES.map(t => {
                const status = regenStatus[t.id]
                const regenerating = regeneratingId === t.id
                const displayContent = regenContent[t.id] || t.contenu
                const isRegenerated = !!regenContent[t.id]
                return (
                  <div key={t.id} className="card fade-in-up">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 15 }}>
                          {t.titre}
                          {isRegenerated && <span style={{ marginLeft: 8, fontSize: 10, color: 'var(--nerixi-accent)', background: 'rgba(0,200,120,0.12)', border: '1px solid rgba(0,200,120,0.3)', padding: '2px 8px', borderRadius: 999, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>✨ régénéré par n8n</span>}
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        {isRegenerated && (
                          <button onClick={() => resetRegenerated(t.id)}
                            style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '8px 12px', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                            ↩ Original
                          </button>
                        )}
                        <button onClick={() => copyToClipboard(displayContent, t.id)}
                          style={{
                            background: copiedId === t.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.6)',
                            border: `1px solid ${copiedId === t.id ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                            borderRadius: 8, padding: '8px 14px',
                            color: copiedId === t.id ? '#06101f' : 'var(--nerixi-text)',
                            cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                            transition: 'all 0.2s ease'
                          }}>
                          {copiedId === t.id ? '✓ Copié' : '📋 Copier'}
                        </button>
                        <button onClick={() => regenerateLinkedIn(t)} disabled={regenerating}
                          className="btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
                          {regenerating ? <><span className="spinner" /> &nbsp;Génération…</> : '✨ Régénérer par n8n'}
                        </button>
                      </div>
                    </div>
                    {status && (
                      <div className="fade-in" style={{
                        marginBottom: 12, padding: '10px 12px',
                        background: status.ok ? 'rgba(0,200,120,0.10)' : 'rgba(226,75,74,0.10)',
                        border: `1px solid ${status.ok ? 'rgba(0,200,120,0.3)' : 'rgba(226,75,74,0.3)'}`,
                        color: status.ok ? '#00e89a' : '#ff8a89',
                        borderRadius: 8, fontSize: 12.5, fontWeight: 600,
                      }}>
                        {status.ok ? '✅ Nouveau contenu généré par n8n' : `⚠ ${status.msg}`}
                      </div>
                    )}
                    <div style={{ background: 'rgba(10,22,40,0.6)', border: `1px solid ${isRegenerated ? 'rgba(0,200,120,0.4)' : 'var(--nerixi-border)'}`, borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-line', color: 'var(--nerixi-text)', transition: 'border-color 0.3s ease' }}>
                      {displayContent}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        </div>
      </main>

      {selectedClient && (
        <ClientDetail
          client={clients.find(c => c.id === selectedClient.id) || selectedClient}
          onClose={() => setSelectedClient(null)}
          onEmail={(c) => { setSelectedClient(null); setEmailClient(c) }}
          onEdit={(c) => { setSelectedClient(null); setEditingClient(c) }}
          onOnboarding={(c) => { handleClientSaved(c); setSelectedClient(c) }}
          onTimeline={(c) => { setSelectedClient(null); setTimelineClient(c) }}
          stripePayments={stripePayments}
          events={events}
          tasks={tasks}
          onCreateTask={createTask}
          onUpdateTask={updateTaskFn}
          onDeleteTask={deleteTaskFn}
          onClientPatch={async (id, patch) => {
            const cur = clients.find(c => c.id === id)
            if (!cur) return
            const res = await fetch(`/api/clients/${id}`, {
              method: 'PUT', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...cur, ...patch }),
            })
            const data = await res.json()
            if (data.client) handleClientSaved(data.client)
          }}
        />
      )}
      {timelineClient && (
        <ClientTimeline
          client={clients.find(c => c.id === timelineClient.id) || timelineClient}
          onClose={() => setTimelineClient(null)}
          stripePayments={stripePayments}
          events={events}
        />
      )}
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        ctx={{
          clients, setActiveTab, setSelectedClient, setCreatingClient,
          setEmailClient, setTimelineClient,
          refreshStripe, refreshAll: refreshData, logout,
        }}
      />

      <RealtimeToastStack toasts={toasts} onDismiss={dismissToast} />

      <YearRecap
        open={recapOpen}
        onClose={() => setRecapOpen(false)}
        clients={clients}
        events={events}
        stripePayments={stripePayments}
      />
      {emailClient && (
        <EmailModal client={emailClient} onClose={() => setEmailClient(null)} customTemplates={emailTemplates} />
      )}
      {editingTemplate && (
        <EmailTemplateEditor
          initial={editingTemplate.id ? editingTemplate : null}
          onClose={() => setEditingTemplate(null)}
          onSaved={handleTemplateSaved}
          onDeleted={handleTemplateDeleted}
        />
      )}
      {editingClient && (
        <ClientForm
          client={editingClient}
          onClose={() => setEditingClient(null)}
          onSaved={handleClientSaved}
          onDeleted={handleClientDeleted}
        />
      )}
      {creatingClient && (
        <ClientForm
          client={null}
          onClose={() => setCreatingClient(false)}
          onSaved={handleClientSaved}
        />
      )}
    </div>
  )
}
