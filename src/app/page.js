'use client'
import { useState, useEffect, useMemo } from 'react'
import Login, { useAuth } from '@/components/Login'
import Calendar from '@/components/Calendar'
import { MRRChart, ClientGrowthChart, StatusBreakdown } from '@/components/Charts'
import ClientForm from '@/components/ClientForm'
import PaymentTracking from '@/components/PaymentTracking'

const TABS = [
  { id: 'Dashboard', icon: '📊' },
  { id: 'Clients',   icon: '👥' },
  { id: 'Agenda',    icon: '📅' },
  { id: 'Suivi',     icon: '💰', label: 'Suivi paiements' },
  { id: 'Stripe',    icon: '💳', label: 'Stripe' },
  { id: 'Emails',    icon: '📧' },
  { id: 'LinkedIn',  icon: '💼' },
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

function StatCard({ label, value, sub, icon }) {
  return (
    <div className="card fade-in-up" style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -30, right: -30, width: 120, height: 120, background: 'radial-gradient(circle, rgba(0,200,120,0.12), transparent 70%)', borderRadius: '50%' }} />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 600 }}>{label}</p>
        {icon && <span style={{ fontSize: 18 }}>{icon}</span>}
      </div>
      <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--nerixi-text)', letterSpacing: -0.5 }}>{value}</p>
      {sub && <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 6 }}>{sub}</p>}
    </div>
  )
}

function ClientCard({ client, onClick, onEdit }) {
  return (
    <div className="card card-hover fade-in-up" onClick={() => onClick(client)} style={{ position: 'relative' }}>
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
            <p style={{ fontWeight: 600, fontSize: 15 }}>{client.nom}</p>
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

function ClientDetail({ client, onClose, onEmail, onEdit }) {
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

        <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
          {[
            { label: 'MRR', value: `${client.mrr}€` },
            { label: 'Installation', value: `${client.installation}€` },
            { label: 'Avancement', value: `${client.avancement}%` },
          ].map((it, i) => (
            <div key={i} style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: '12px', textAlign: 'center' }}>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{it.label}</p>
              <p style={{ fontSize: 20, fontWeight: 700, color: 'var(--nerixi-accent)', marginTop: 4 }}>{it.value}</p>
            </div>
          ))}
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

        {client.prochainAction && (
          <div style={{ background: 'linear-gradient(120deg, rgba(0,200,120,0.12), rgba(54,230,196,0.06))', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 14, marginBottom: 22 }}>
            <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Prochaine action</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--nerixi-accent)', marginTop: 4 }}>→ {client.prochainAction}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button className="btn-primary" onClick={() => onEmail(client)} style={{ flex: 1, minWidth: 130 }}>
            Envoyer un email
          </button>
          <button onClick={() => onEdit(client)} className="btn-secondary" style={{ flex: 1, minWidth: 130 }}>
            ✎ Modifier
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

function EmailModal({ client, onClose }) {
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
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex: 60 }}>
      <div className="card modal-card" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="modal-close">✕</button>
        <p style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>Email à {client.nom}</p>
        <p style={{ fontSize: 13, color: 'var(--nerixi-muted)', marginBottom: 22 }}>{client.email}</p>

        <div style={{ marginBottom: 18 }}>
          <label>Template rapide</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {EMAIL_TEMPLATES.map(t => (
              <button key={t.id} onClick={() => applyTemplate(t)}
                style={{
                  background: selectedTemplate === t.id ? 'rgba(0,200,120,0.15)' : 'rgba(10,22,40,0.6)',
                  border: `1px solid ${selectedTemplate === t.id ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                  borderRadius: 10, padding: '11px 14px', color: 'var(--nerixi-text)',
                  cursor: 'pointer', textAlign: 'left', fontSize: 13,
                  transition: 'all 0.2s ease'
                }}>
                {selectedTemplate === t.id ? '✓ ' : '○ '}{t.titre}
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

function StripeView() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [payments, setPayments] = useState([])
  const [mode, setMode] = useState('demo')
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/stripe/payments', { cache: 'no-store' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setPayments(data.payments || [])
      setMode(data.mode || 'demo')
    } catch (e) { setError(e.message) }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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
          <button onClick={load} className="btn-secondary" style={{ padding: '8px 16px', fontSize: 13 }}>↻ Actualiser</button>
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

      {error && <div className="card" style={{ borderColor: 'rgba(226,75,74,0.3)', color: '#ff8a89', marginBottom: 16 }}>⚠ {error}</div>}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
          <span className="spinner" /> <p style={{ marginTop: 12, fontSize: 13 }}>Chargement…</p>
        </div>
      ) : filtered.length === 0 ? (
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
  const [copiedId, setCopiedId] = useState(null)
  const [emailTab, setEmailTab] = useState('templates')
  const [emailTo, setEmailTo] = useState('')
  const [emailSujet, setEmailSujet] = useState('')
  const [emailContenu, setEmailContenu] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const [clients, setClients] = useState([])
  const [events, setEvents] = useState([])
  const [payments, setPayments] = useState([])
  const [loadingData, setLoadingData] = useState(true)

  const stats = useMemo(() => ({
    mrr_total: clients.filter(c => c.statut === 'actif' || c.statut === 'en-cours').reduce((s, c) => s + (Number(c.mrr) || 0), 0),
    installation_total: clients.reduce((s, c) => s + (Number(c.installation) || 0), 0),
    clients_actifs: clients.filter(c => c.statut === 'actif').length,
    clients_en_cours: clients.filter(c => c.statut === 'en-cours').length,
  }), [clients])

  const refreshData = async () => {
    try {
      const [cRes, eRes, pRes] = await Promise.all([
        fetch('/api/clients', { cache: 'no-store' }),
        fetch('/api/events',  { cache: 'no-store' }),
        fetch('/api/payments', { cache: 'no-store' }),
      ])
      const c = await cRes.json()
      const e = await eRes.json()
      const p = await pRes.json()
      setClients(c.clients || [])
      setEvents(e.events || [])
      setPayments(p.payments || [])
    } catch (e) {}
    setLoadingData(false)
  }

  useEffect(() => {
    if (authed) refreshData()
  }, [authed])

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
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
  const togglePayment = async (id, status) => {
    const res = await fetch('/api/payments', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) })
    const data = await res.json()
    if (data.payment) setPayments(prev => prev.map(p => p.id === id ? data.payment : p))
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
        <div style={{ padding: '0 22px 18px', borderBottom: '1px solid var(--nerixi-border)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: 'linear-gradient(135deg, var(--nerixi-green), var(--nerixi-accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: '#06101f', boxShadow: '0 6px 16px rgba(0,200,120,0.35)' }}>N</div>
          <div>
            <p className="logo-glow" style={{ fontSize: 16, margin: 0 }}>NERIXI</p>
            <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 1, textTransform: 'uppercase', letterSpacing: 1 }}>CRM Dashboard</p>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
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

        <div style={{ marginTop: 'auto', padding: '18px 22px', borderTop: '1px solid var(--nerixi-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg, var(--nerixi-green), var(--nerixi-accent-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#06101f' }}>T</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--nerixi-text)' }}>Téo</p>
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
      <main className="main-content" style={{ flex: 1, padding: 36, overflowY: 'auto', minWidth: 0 }} key={activeTab}>

        {loadingData && (
          <div style={{ position: 'fixed', top: 12, right: 16, zIndex: 30, fontSize: 11.5, color: 'var(--nerixi-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span className="spinner" /> Synchronisation…
          </div>
        )}

        {/* DASHBOARD */}
        {activeTab === 'Dashboard' && (
          <div className="fade-in">
            <div style={{ marginBottom: 24 }}>
              <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>Tableau de bord</h1>
              <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>Vue d'ensemble de ton activité Nerixi</p>
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

            <div className="grid-3" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 22 }}>
              <StatCard label="MRR Total"     value={`${stats.mrr_total.toLocaleString('fr-FR')}€`}          sub="Revenus récurrents/mois"     icon="💰" />
              <StatCard label="Trésorerie"    value={`${stats.installation_total.toLocaleString('fr-FR')}€`} sub="Total installations signées" icon="🏦" />
              <StatCard label="Clients actifs" value={stats.clients_actifs}                                   sub={`+ ${stats.clients_en_cours} en cours`} icon="🚀" />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 22 }}>
              <MRRChart clients={clients} />
            </div>

            <div className="grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16, marginBottom: 22 }}>
              <ClientGrowthChart clients={clients} />
              <StatusBreakdown clients={clients} />
            </div>

            <div style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Clients récents</h2>
              <div className="grid-2 stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
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
            {clients.length === 0 && !loadingData && (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--nerixi-muted)' }}>
                <p style={{ fontSize: 32, marginBottom: 8 }}>👥</p>
                <p>Aucun client pour l'instant.</p>
                <button className="btn-primary" onClick={() => setCreatingClient(true)} style={{ marginTop: 16 }}>+ Créer le premier client</button>
              </div>
            )}
          </div>
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
            payments={payments}
            onTogglePayment={togglePayment}
          />
        )}

        {/* STRIPE */}
        {activeTab === 'Stripe' && <StripeView />}

        {/* EMAILS */}
        {activeTab === 'Emails' && (
          <div className="fade-in">
            <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>📧 Emails</h1>
            <p style={{ color: 'var(--nerixi-muted)', marginBottom: 22 }}>Envoie des emails à tes clients via Brevo</p>

            <div style={{ display: 'inline-flex', gap: 4, marginBottom: 22, background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 12, padding: 4 }}>
              {['templates', 'composer'].map(t => (
                <button key={t} onClick={() => setEmailTab(t)}
                  style={{
                    background: emailTab === t ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'transparent',
                    border: 'none', borderRadius: 8, padding: '8px 22px',
                    color: emailTab === t ? '#06101f' : 'var(--nerixi-muted)',
                    cursor: 'pointer', fontWeight: 600, fontSize: 13, transition: 'all 0.2s ease'
                  }}>
                  {t === 'templates' ? 'Templates' : 'Composer'}
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

            {emailTab === 'composer' && (
              <div className="card fade-in-up" style={{ maxWidth: 620 }}>
                <p style={{ fontWeight: 700, marginBottom: 20, fontSize: 15 }}>Composer un email</p>
                <div style={{ marginBottom: 14 }}>
                  <label>Destinataire</label>
                  <input value={emailTo} onChange={e => setEmailTo(e.target.value)} placeholder="email@client.fr" />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label>Objet</label>
                  <input value={emailSujet} onChange={e => setEmailSujet(e.target.value)} placeholder="Objet de l'email..." />
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label>Message</label>
                  <textarea value={emailContenu} onChange={e => setEmailContenu(e.target.value)} placeholder="Ton message..." rows={8} style={{ resize: 'vertical' }} />
                </div>
                {sent && <p className="fade-in" style={{ color: 'var(--nerixi-accent)', fontSize: 13, marginBottom: 12 }}>✅ Email envoyé !</p>}
                <button className="btn-primary" onClick={sendDirectEmail} disabled={sending} style={{ width: '100%' }}>
                  {sending ? <><span className="spinner" /> &nbsp;Envoi…</> : 'Envoyer via Brevo'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* LINKEDIN */}
        {activeTab === 'LinkedIn' && (
          <div className="fade-in">
            <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, marginBottom: 8, letterSpacing: -0.5 }}>💼 LinkedIn</h1>
            <p style={{ color: 'var(--nerixi-muted)', marginBottom: 22 }}>Templates de publications LinkedIn prêts à copier-coller</p>

            <div className="stagger" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {LINKEDIN_TEMPLATES.map(t => (
                <div key={t.id} className="card fade-in-up">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 8, flexWrap: 'wrap' }}>
                    <p style={{ fontWeight: 700, fontSize: 15 }}>{t.titre}</p>
                    <button onClick={() => copyToClipboard(t.contenu, t.id)}
                      style={{
                        background: copiedId === t.id ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.6)',
                        border: `1px solid ${copiedId === t.id ? 'var(--nerixi-green)' : 'var(--nerixi-border)'}`,
                        borderRadius: 8, padding: '8px 16px',
                        color: copiedId === t.id ? '#06101f' : 'var(--nerixi-text)',
                        cursor: 'pointer', fontSize: 13, fontWeight: 600,
                        transition: 'all 0.2s ease'
                      }}>
                      {copiedId === t.id ? '✓ Copié !' : 'Copier'}
                    </button>
                  </div>
                  <div style={{ background: 'rgba(10,22,40,0.6)', border: '1px solid var(--nerixi-border)', borderRadius: 10, padding: 16, fontSize: 13, lineHeight: 1.8, whiteSpace: 'pre-line', color: 'var(--nerixi-text)' }}>
                    {t.contenu}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {selectedClient && (
        <ClientDetail
          client={selectedClient}
          onClose={() => setSelectedClient(null)}
          onEmail={(c) => { setSelectedClient(null); setEmailClient(c) }}
          onEdit={(c) => { setSelectedClient(null); setEditingClient(c) }}
        />
      )}
      {emailClient && (
        <EmailModal client={emailClient} onClose={() => setEmailClient(null)} />
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
