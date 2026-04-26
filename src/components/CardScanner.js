'use client'
import { useEffect, useRef, useState } from 'react'

const TESSERACT_CDN = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js'

let tesseractPromise = null
function loadTesseract() {
  if (typeof window === 'undefined') return Promise.reject(new Error('SSR'))
  if (window.Tesseract) return Promise.resolve(window.Tesseract)
  if (tesseractPromise) return tesseractPromise
  tesseractPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = TESSERACT_CDN
    script.async = true
    script.onload = () => resolve(window.Tesseract)
    script.onerror = () => reject(new Error('Échec chargement Tesseract.js'))
    document.head.appendChild(script)
  })
  return tesseractPromise
}

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g
const PHONE_RE = /(\+?\d{1,3}[\s.-]?)?(?:\(\d{1,4}\)[\s.-]?)?\d[\d\s.-]{7,15}\d/g
const URL_RE   = /(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w.-]+(?:\/\S*)?/g
const ROLES    = ['ceo','cto','cfo','dg','dga','directeur','directrice','fondateur','fondatrice','co-fondateur','president','présidente','manager','responsable','chef','consultant','associé','partner','founder','owner','gérant','dirigeant']
const COMPANY_HINTS = ['sas','sasu','sarl','eurl','sa ','snc','scop','sci','ltd','llc','inc','gmbh','&','et associés','company','company.','co.','group','agency','studio','tech','solutions','services','consulting','consult']

function parseBusinessCard(text) {
  const cleaned = text.replace(/\r/g, '').replace(/[\u00A0]/g, ' ')
  const lines = cleaned.split('\n').map(l => l.trim()).filter(Boolean)

  const emails = (cleaned.match(EMAIL_RE) || []).map(e => e.toLowerCase())
  const phones = (cleaned.match(PHONE_RE) || [])
    .map(p => p.replace(/\s+/g, ' ').trim())
    .filter(p => p.replace(/\D/g, '').length >= 9)
  const urls = (cleaned.match(URL_RE) || [])
    .filter(u => !u.includes('@'))
    .map(u => u.replace(/^www\./, ''))

  const linkedin = urls.find(u => u.toLowerCase().includes('linkedin.'))
  const otherUrls = urls.filter(u => !u.toLowerCase().includes('linkedin.'))

  const lower = (s) => s.toLowerCase()
  let nom = ''
  let entreprise = ''
  let role = ''

  // Heuristic: first 1-3 lines often contain name + role + company
  const head = lines.slice(0, 6)

  for (const line of head) {
    const lc = lower(line)
    if (!nom && line.split(' ').length >= 2 && line.split(' ').length <= 4
        && !line.match(/\d/) && !lc.match(/@/)
        && !ROLES.some(r => lc.includes(r))
        && !COMPANY_HINTS.some(h => lc.includes(h))
        && line === line.replace(/[^a-zA-ZÀ-ÿ' -]/g, line[0])) {
      // name candidate (no digits, no @, no role, mostly letters, 2-4 words)
      nom = line
      continue
    }
    if (!role && ROLES.some(r => lc.includes(r))) {
      role = line
      continue
    }
    if (!entreprise && COMPANY_HINTS.some(h => lc.includes(h))) {
      entreprise = line
      continue
    }
  }

  // Fallback: if no entreprise yet, derive from email domain
  if (!entreprise && emails[0]) {
    const dom = emails[0].split('@')[1]
    if (dom && !['gmail.com','outlook.com','yahoo.fr','yahoo.com','hotmail.com','hotmail.fr','wanadoo.fr','orange.fr','free.fr','laposte.net','protonmail.com','me.com','icloud.com'].includes(dom)) {
      entreprise = dom.split('.').slice(0, -1).join('.').replace(/^./, c => c.toUpperCase())
    }
  }

  // Fallback nom : if not found, use the first non-trivial line
  if (!nom) {
    nom = head.find(l => !l.match(EMAIL_RE) && !l.match(PHONE_RE) && !l.match(URL_RE) && l.length > 2 && l.length < 60) || ''
  }

  return {
    nom,
    entreprise,
    email: emails[0] || '',
    telephone: phones[0] || '',
    linkedin: linkedin ? (linkedin.startsWith('http') ? linkedin : 'https://' + linkedin) : '',
    role,
    site: otherUrls[0] || '',
    rawText: cleaned,
  }
}

export default function CardScanner({ onImport, onClose }) {
  const [phase, setPhase] = useState('idle') // idle | preview | scanning | done
  const [imageUrl, setImageUrl] = useState(null)
  const [progress, setProgress] = useState(0)
  const [parsed, setParsed] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const cameraRef = useRef(null)

  useEffect(() => {
    return () => { if (imageUrl) URL.revokeObjectURL(imageUrl) }
  }, [imageUrl])

  const onFile = (file) => {
    setError('')
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Format image requis'); return }
    setImageUrl(URL.createObjectURL(file))
    setPhase('preview')
    runOCR(file)
  }

  const runOCR = async (file) => {
    setPhase('scanning')
    setProgress(0)
    try {
      const Tesseract = await loadTesseract()
      const { data } = await Tesseract.recognize(file, 'fra+eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') setProgress(Math.round(m.progress * 100))
        },
      })
      const result = parseBusinessCard(data.text || '')
      setParsed(result)
      setPhase('done')
    } catch (e) {
      setError(e.message || 'Erreur OCR')
      setPhase('preview')
    }
  }

  const update = (k, v) => setParsed(p => ({ ...p, [k]: v }))

  const importIt = () => {
    if (!parsed?.nom && !parsed?.entreprise && !parsed?.email) {
      setError('Aucune info détectée — édite manuellement')
      return
    }
    onImport({
      nom: parsed.nom || '',
      entreprise: parsed.entreprise || (parsed.nom ? `${parsed.nom} (auto)` : ''),
      email: parsed.email || '',
      telephone: parsed.telephone || '',
      linkedin: parsed.linkedin || '',
      secteur: 'Autre',
      role: parsed.role || '',
      notes: parsed.site ? `Site : ${parsed.site}` : '',
    })
    onClose()
  }

  return (
    <div>
      {phase === 'idle' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <p style={{ fontSize: 12.5, color: 'var(--nerixi-muted)', marginBottom: 6 }}>
            Prends une photo de la carte de visite ou choisis une image. L'OCR tourne en local (gratuit, données privées).
          </p>
          <input
            ref={cameraRef}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={e => onFile(e.target.files?.[0])}
          />
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={e => onFile(e.target.files?.[0])}
          />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <button onClick={() => cameraRef.current?.click()} className="btn-primary" style={{ padding: '14px', fontSize: 14 }}>
              📷 Prendre une photo
            </button>
            <button onClick={() => fileRef.current?.click()} className="btn-secondary" style={{ padding: '14px', fontSize: 14 }}>
              🖼️ Choisir une image
            </button>
          </div>
        </div>
      )}

      {(phase === 'preview' || phase === 'scanning' || phase === 'done') && imageUrl && (
        <div>
          <div style={{ position: 'relative', marginBottom: 14 }}>
            <img src={imageUrl} alt="Carte" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--nerixi-border)' }} />
            {phase === 'scanning' && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(6,16,31,0.8)', borderRadius: 10, flexDirection: 'column', gap: 10 }}>
                <span className="spinner" />
                <p style={{ color: 'var(--nerixi-accent)', fontWeight: 700 }}>Analyse OCR · {progress}%</p>
              </div>
            )}
          </div>

          {phase === 'done' && parsed && (
            <div className="fade-in-up" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--nerixi-muted)', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>
                ✓ Champs détectés (édite si besoin)
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label>Nom</label><input value={parsed.nom} onChange={e => update('nom', e.target.value)} placeholder="Pierre Martin" /></div>
                <div><label>Entreprise</label><input value={parsed.entreprise} onChange={e => update('entreprise', e.target.value)} placeholder="Martin Commerce" /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label>Email</label><input value={parsed.email} onChange={e => update('email', e.target.value)} placeholder="contact@..." /></div>
                <div><label>Téléphone</label><input value={parsed.telephone} onChange={e => update('telephone', e.target.value)} placeholder="06 ..." /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div><label>Rôle</label><input value={parsed.role} onChange={e => update('role', e.target.value)} placeholder="DG, Fondateur..." /></div>
                <div><label>LinkedIn / site</label><input value={parsed.linkedin || parsed.site} onChange={e => update('linkedin', e.target.value)} placeholder="linkedin.com/in/..." /></div>
              </div>

              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', color: 'var(--nerixi-muted)', fontSize: 11.5 }}>Voir le texte brut OCR</summary>
                <pre style={{
                  marginTop: 8, padding: 10, background: 'rgba(10,22,40,0.5)', border: '1px solid var(--nerixi-border)',
                  borderRadius: 8, fontSize: 11, lineHeight: 1.5, color: 'var(--nerixi-muted)',
                  whiteSpace: 'pre-wrap', maxHeight: 160, overflowY: 'auto',
                  fontFamily: 'ui-monospace, Menlo, monospace',
                }}>{parsed.rawText}</pre>
              </details>
            </div>
          )}

          {error && <p style={{ color: '#ff8a89', fontSize: 13, marginTop: 10 }}>⚠ {error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
            <button onClick={() => { setPhase('idle'); setImageUrl(null); setParsed(null); setError('') }}
              className="btn-secondary" style={{ flex: 1, minWidth: 130 }}>
              ↺ Recommencer
            </button>
            {phase === 'done' && (
              <button onClick={importIt} className="btn-primary" style={{ flex: 2, minWidth: 200 }}>
                + Importer dans Prospection
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
