'use client'
import { useRef, useState } from 'react'
import CardScanner from './CardScanner'
import Modal from './Modal'

const REQUIRED_HEADERS = ['nom', 'entreprise']
const KNOWN_HEADERS = ['nom', 'entreprise', 'email', 'telephone', 'téléphone', 'phone', 'linkedin', 'secteur', 'industry', 'role', 'poste']

function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0)
  if (lines.length < 2) return { headers: [], rows: [] }

  const split = (line) => {
    const cells = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; continue }
      if (ch === '"') { inQ = !inQ; continue }
      if ((ch === ',' || ch === ';') && !inQ) { cells.push(cur); cur = ''; continue }
      cur += ch
    }
    cells.push(cur)
    return cells.map(s => s.trim())
  }

  const headers = split(lines[0]).map(h => h.toLowerCase().trim())
  const rows = lines.slice(1).map(line => {
    const cells = split(line)
    const obj = {}
    headers.forEach((h, i) => { obj[h] = cells[i] || '' })
    return obj
  })
  return { headers, rows }
}

function normalizeProspect(row, idx) {
  const phone = row.telephone || row['téléphone'] || row.phone || ''
  return {
    id: `prosp_${idx}_${Date.now()}`,
    nom: row.nom || '',
    entreprise: row.entreprise || '',
    email: row.email || '',
    telephone: phone,
    linkedin: row.linkedin || '',
    secteur: row.secteur || row.industry || 'Autre',
    role: row.role || row.poste || '',
    raw: row,
  }
}

const LINKEDIN_PROMPT = `Tu es Carl, agent de prospection LinkedIn pour Nerixi (automatisation IA pour PME).

Mission : générer un message LinkedIn court, naturel et personnalisé pour le contact ci-dessous.

Style :
- Tutoiement direct, ton humain (pas robotique)
- 4-5 phrases max
- Une accroche basée sur leur contexte (entreprise, secteur)
- Un angle de valeur (gain de temps, automatisation, ROI)
- Une question ouverte ou un CTA léger
- Pas de "j'espère que vous allez bien"
- Pas de #hashtag #spam

Contact :
{prospect}

Réponds uniquement avec le message LinkedIn, sans intro ni signature.`

const EMAIL_PROMPT = `Tu es Alex, agent emailing pour Nerixi (automatisation IA pour PME et grands comptes).

Mission : générer un email de prospection à froid pour le contact ci-dessous.

Style :
- Vouvoiement professionnel mais humain
- 6-8 phrases max
- Objet court et accrocheur (max 60 caractères)
- Premier paragraphe : accroche personnalisée sur leur secteur/entreprise
- Deuxième paragraphe : valeur concrète (chiffre, exemple)
- Troisième paragraphe : CTA simple (15 min d'appel)
- Signature : Téo · Fondateur Nerixi · nerixi.fr

Contact :
{prospect}

Format de sortie :
Sujet : ...

[corps de l'email]`

function buildPrompt(template, prospect) {
  const block = Object.entries(prospect)
    .filter(([k]) => k !== 'id' && k !== 'raw')
    .filter(([_, v]) => v)
    .map(([k, v]) => `- ${k} : ${v}`)
    .join('\n')
  return template.replace('{prospect}', block)
}

export default function Prospection({ onImport, claudeProjects = {} }) {
  const [prospects, setProspects] = useState([])
  const [error, setError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [importing, setImporting] = useState({})
  const [copied, setCopied] = useState(null)
  const [scannerOpen, setScannerOpen] = useState(false)
  const fileRef = useRef(null)

  const onFile = async (file) => {
    setError('')
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv') && file.type !== 'text/csv') {
      setError('Le fichier doit être un .csv')
      return
    }
    const text = await file.text()
    const { headers, rows } = parseCSV(text)
    const missing = REQUIRED_HEADERS.filter(h => !headers.includes(h))
    if (missing.length) {
      setError(`Colonnes manquantes : ${missing.join(', ')}. Headers détectés : ${headers.join(', ') || '(aucun)'}`)
      return
    }
    const parsed = rows.map(normalizeProspect).filter(p => p.nom && p.entreprise)
    setProspects(prev => [...parsed, ...prev])
  }

  const copyBrief = async (template, prospect, key) => {
    const txt = buildPrompt(template, prospect)
    await navigator.clipboard.writeText(txt)
    setCopied(`${key}_${prospect.id}`)
    setTimeout(() => setCopied(null), 2000)
  }

  const importToCRM = async (prospect) => {
    setImporting(p => ({ ...p, [prospect.id]: true }))
    try {
      await onImport({
        nom: prospect.nom,
        entreprise: prospect.entreprise,
        email: prospect.email,
        telephone: prospect.telephone,
        linkedin: prospect.linkedin,
        secteur: prospect.secteur || 'Autre',
        statut: 'prospect',
        notes: prospect.role ? `Rôle : ${prospect.role}` : '',
      })
      setProspects(prev => prev.filter(p => p.id !== prospect.id))
    } catch (e) {
      setError('Erreur import : ' + e.message)
    }
    setImporting(p => { const c = { ...p }; delete c[prospect.id]; return c })
  }

  const downloadSample = () => {
    const sample = `nom,entreprise,email,telephone,linkedin,secteur,role
Pierre Martin,Martin Commerce,pierre@martincommerce.fr,06 12 34 56 78,https://linkedin.com/in/pierre-martin,Commerce,DG
Sophie Dubois,Dubois & Associés,sophie@dubois.fr,06 98 76 54 32,,Conseil,Associée`
    const blob = new Blob([sample], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'nerixi-prospects-template.csv'
    document.body.appendChild(a); a.click(); a.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h1 className="h1-page" style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>📥 Prospection</h1>
          <p style={{ color: 'var(--nerixi-muted)', marginTop: 6 }}>
            Upload un CSV → génère DM LinkedIn (Carl) et email (Alex) → importe dans le CRM
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => setScannerOpen(true)} className="btn-primary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
            📸 Scanner une carte
          </button>
          <button onClick={downloadSample} className="btn-secondary" style={{ padding: '8px 14px', fontSize: 12.5 }}>
            📋 CSV exemple
          </button>
        </div>
      </div>

      <div
        className={`dropzone ${dragOver ? 'is-over' : ''}`}
        onClick={() => fileRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={e => { e.preventDefault(); setDragOver(false); onFile(e.dataTransfer.files?.[0]) }}
      >
        <input ref={fileRef} type="file" accept=".csv,text/csv" style={{ display: 'none' }} onChange={e => onFile(e.target.files?.[0])} />
        <p style={{ fontSize: 28, marginBottom: 8 }}>📄</p>
        <p style={{ fontWeight: 600, fontSize: 14 }}>Glisse ton CSV ici ou clique pour choisir</p>
        <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>Colonnes attendues : nom, entreprise (requises) · email, telephone, linkedin, secteur, role (optionnelles)</p>
      </div>

      {error && <p style={{ color: '#ff8a89', fontSize: 13, marginTop: 12 }}>⚠ {error}</p>}

      {prospects.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>{prospects.length} prospect{prospects.length > 1 ? 's' : ''} à traiter</p>
            <button onClick={() => setProspects([])}
              style={{ background: 'transparent', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '6px 12px', color: 'var(--nerixi-muted)', cursor: 'pointer', fontSize: 12 }}>
              Vider la liste
            </button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {prospects.map(p => (
              <div key={p.id} className="card fade-in-up" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, rgba(0,200,120,0.25), rgba(54,230,196,0.15))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--nerixi-accent)', flexShrink: 0 }}>
                      {p.entreprise.charAt(0).toUpperCase()}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: 14 }}>{p.entreprise}</p>
                      <p style={{ fontSize: 12, color: 'var(--nerixi-muted)' }}>{p.nom}{p.role ? ` · ${p.role}` : ''}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, fontSize: 12, color: 'var(--nerixi-muted)' }}>
                    {p.email     && <span>📧 {p.email}</span>}
                    {p.telephone && <span>📞 {p.telephone}</span>}
                    {p.linkedin  && <a href={p.linkedin} target="_blank" style={{ color: 'var(--nerixi-accent)' }}>💼 LinkedIn</a>}
                    {p.secteur   && <span style={{ background: 'rgba(0,200,120,0.08)', border: '1px solid var(--nerixi-border)', borderRadius: 999, padding: '1px 9px' }}>{p.secteur}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <button onClick={() => copyBrief(LINKEDIN_PROMPT, p, 'li')}
                    style={{ background: copied === `li_${p.id}` ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: copied === `li_${p.id}` ? '#06101f' : 'var(--nerixi-text)', fontWeight: 600, transition: 'all 0.2s ease', textAlign: 'left' }}>
                    {copied === `li_${p.id}` ? '✓ Brief copié' : '🤖 Brief LinkedIn (Carl)'}
                  </button>
                  <button onClick={() => copyBrief(EMAIL_PROMPT, p, 'em')}
                    style={{ background: copied === `em_${p.id}` ? 'linear-gradient(120deg, var(--nerixi-green), var(--nerixi-accent))' : 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer', fontSize: 12, color: copied === `em_${p.id}` ? '#06101f' : 'var(--nerixi-text)', fontWeight: 600, transition: 'all 0.2s ease', textAlign: 'left' }}>
                    {copied === `em_${p.id}` ? '✓ Brief copié' : '🤖 Brief email (Alex)'}
                  </button>
                  <button onClick={() => importToCRM(p)} disabled={importing[p.id]}
                    className="btn-primary" style={{ padding: '7px 12px', fontSize: 12, opacity: importing[p.id] ? 0.6 : 1 }}>
                    {importing[p.id] ? <><span className="spinner" /> &nbsp;…</> : '+ Importer dans CRM'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 18, padding: 14, background: 'rgba(0,200,120,0.05)', border: '1px solid var(--nerixi-border)', borderRadius: 12, fontSize: 12.5, color: 'var(--nerixi-muted)', lineHeight: 1.6 }}>
            <p style={{ fontWeight: 700, color: 'var(--nerixi-text)', marginBottom: 6 }}>💡 Comment utiliser les briefs</p>
            Clique sur "Brief LinkedIn" ou "Brief email" → le prompt prêt-à-l'emploi est copié dans ton presse-papier. Colle-le dans Claude.ai (
            {claudeProjects?.carl
              ? <a href={claudeProjects.carl} target="_blank" style={{ color: 'var(--nerixi-accent)' }}>projet Carl</a>
              : <span>configurable dans l'onglet Agents</span>}
            ) → tu reçois le message personnalisé prêt à envoyer.
          </div>
        </div>
      )}

      {scannerOpen && (
        <Modal onClose={() => setScannerOpen(false)} contentStyle={{ maxWidth: 560 }}>
          <button onClick={() => setScannerOpen(false)} className="modal-close">✕</button>
          <p style={{ fontWeight: 800, fontSize: 17, marginBottom: 4 }}>📸 Scanner une carte de visite</p>
          <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginBottom: 18 }}>OCR local via Tesseract — gratuit, privé, données ne quittent pas ton navigateur.</p>
          <CardScanner
            onClose={() => setScannerOpen(false)}
            onImport={(prospect) => {
              const p = normalizeProspect({
                nom: prospect.nom,
                entreprise: prospect.entreprise,
                email: prospect.email,
                telephone: prospect.telephone,
                linkedin: prospect.linkedin,
                secteur: prospect.secteur,
                role: prospect.role,
              }, Date.now())
              setProspects(prev => [{ ...p, notes: prospect.notes }, ...prev])
            }}
          />
        </Modal>
      )}
    </div>
  )
}
