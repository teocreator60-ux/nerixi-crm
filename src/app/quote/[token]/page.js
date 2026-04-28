'use client'
import { useEffect, useRef, useState } from 'react'

function fmt(n) { return (Number(n) || 0).toLocaleString('fr-FR') }

export default function PublicQuotePage({ params }) {
  const [quote, setQuote] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [signing, setSigning] = useState(false)
  const [signedBy, setSignedBy] = useState('')
  const canvasRef = useRef(null)
  const drawingRef = useRef(false)
  const lastRef = useRef(null)
  const [hasSigned, setHasSigned] = useState(false)

  useEffect(() => {
    fetch(`/api/quotes/public/${params.token}`)
      .then(r => r.json())
      .then(d => {
        if (d.error) setError(d.error)
        else setQuote(d.quote)
      })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false))
  }, [params.token])

  // Init canvas
  useEffect(() => {
    if (!signing) return
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvas.offsetWidth * 2
    canvas.height = canvas.offsetHeight * 2
    const ctx = canvas.getContext('2d')
    ctx.scale(2, 2)
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#0a1628'
  }, [signing])

  const getPos = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    const t = e.touches?.[0]
    const cx = t ? t.clientX : e.clientX
    const cy = t ? t.clientY : e.clientY
    return { x: cx - rect.left, y: cy - rect.top }
  }
  const onDown = (e) => { e.preventDefault(); drawingRef.current = true; lastRef.current = getPos(e); setHasSigned(true) }
  const onMove = (e) => {
    if (!drawingRef.current) return
    e.preventDefault()
    const p = getPos(e)
    const ctx = canvasRef.current.getContext('2d')
    ctx.beginPath()
    ctx.moveTo(lastRef.current.x, lastRef.current.y)
    ctx.lineTo(p.x, p.y)
    ctx.stroke()
    lastRef.current = p
  }
  const onUp = () => { drawingRef.current = false }
  const clearSig = () => {
    const canvas = canvasRef.current
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
    setHasSigned(false)
  }

  const submitSign = async () => {
    if (!signedBy.trim()) return alert('Veuillez saisir votre nom complet')
    if (!hasSigned) return alert('Veuillez tracer votre signature')
    const signature = canvasRef.current.toDataURL('image/png')
    const res = await fetch(`/api/quotes/public/${params.token}/sign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ signedBy, signature }),
    })
    const data = await res.json()
    if (data.error) return alert(data.error)
    setQuote(data.quote)
    setSigning(false)
  }

  const downloadPdf = () => window.print()

  if (loading) return <div style={style.center}>Chargement…</div>
  if (error || !quote) return <div style={style.center}>❌ {error || 'Devis introuvable'}</div>

  const isSigned = !!quote.signedAt
  const isPaid = !!quote.paidAt
  const upfront = quote.installation || quote.total

  return (
    <div style={style.page}>
      <style>{`
        @media print {
          body { background: white !important; }
          .no-print { display: none !important; }
          .quote-page { box-shadow: none !important; padding: 0 !important; }
        }
        .nerixi-btn {
          display: inline-block; background: #00c878; color: #0a1628; padding: 12px 28px;
          border-radius: 8px; text-decoration: none; font-weight: 600; border: none; cursor: pointer; font-size: 14px;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .nerixi-btn:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(0,200,120,0.35) }
        .nerixi-btn-sec {
          display: inline-block; background: transparent; color: #0a1628; padding: 11px 22px;
          border: 1px solid #0a1628; border-radius: 8px; text-decoration: none; font-weight: 600; cursor: pointer;
        }
      `}</style>

      <div className="quote-page" style={style.card}>
        <div style={style.header}>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#00c878', margin: 0 }}>NERIXI</h1>
            <p style={{ fontSize: 12, color: '#7a9bb0', marginTop: 4 }}>Automatisation IA pour PME &amp; Grands Comptes</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700 }}>Devis</p>
            <p style={{ fontSize: 18, fontWeight: 700 }}>{quote.quoteNumber}</p>
            <p style={{ fontSize: 12, color: '#888' }}>{new Date(quote.createdAt).toLocaleDateString('fr-FR')}</p>
            {isPaid && <p style={{ ...style.badge, background: '#10b981' }}>✓ Payé</p>}
            {!isPaid && isSigned && <p style={{ ...style.badge, background: '#3b82f6' }}>✍️ Signé</p>}
            {!isSigned && <p style={{ ...style.badge, background: '#f59e0b' }}>En attente</p>}
          </div>
        </div>

        <div style={style.recipient}>
          <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>Destinataire</p>
          <p style={{ fontWeight: 600 }}>{quote.recipientName}</p>
          {quote.company && <p style={{ color: '#666' }}>{quote.company}</p>}
          <p style={{ color: '#666' }}>{quote.recipientEmail}</p>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 6, marginTop: 28 }}>{quote.title}</h2>
        {quote.validUntil && <p style={{ fontSize: 12, color: '#888', marginBottom: 18 }}>Valable jusqu'au {new Date(quote.validUntil).toLocaleDateString('fr-FR')}</p>}

        <table style={style.table}>
          <thead>
            <tr style={{ background: '#0a1628', color: 'white' }}>
              <th style={style.th}>Description</th>
              <th style={{ ...style.th, textAlign: 'right' }}>Qté</th>
              <th style={{ ...style.th, textAlign: 'right' }}>Prix unit.</th>
              <th style={{ ...style.th, textAlign: 'right' }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {quote.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
                <td style={style.td}>
                  <p style={{ fontWeight: 600 }}>{it.label}</p>
                  {it.description && <p style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{it.description}</p>}
                </td>
                <td style={{ ...style.td, textAlign: 'right' }}>{it.quantity}</td>
                <td style={{ ...style.td, textAlign: 'right' }}>{fmt(it.unitPrice)} €</td>
                <td style={{ ...style.td, textAlign: 'right', fontWeight: 600 }}>{fmt(it.unitPrice * it.quantity)} €</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
          <table style={{ minWidth: 280 }}>
            <tbody>
              <tr><td style={style.totalLabel}>Sous-total HT</td><td style={style.totalVal}>{fmt(quote.subtotal)} €</td></tr>
              <tr><td style={style.totalLabel}>TVA ({quote.tvaRate}%)</td><td style={style.totalVal}>{fmt(Math.round(quote.subtotal * quote.tvaRate / 100))} €</td></tr>
              <tr style={{ borderTop: '2px solid #0a1628' }}>
                <td style={{ ...style.totalLabel, fontWeight: 700, fontSize: 16, paddingTop: 8 }}>Total TTC</td>
                <td style={{ ...style.totalVal, fontWeight: 700, fontSize: 16, paddingTop: 8, color: '#00c878' }}>{fmt(quote.total)} €</td>
              </tr>
              {quote.installation > 0 && <tr><td style={style.totalLabel}>Acompte / Installation</td><td style={style.totalVal}>{fmt(quote.installation)} €</td></tr>}
              {quote.monthly > 0 && <tr><td style={style.totalLabel}>Mensualité</td><td style={style.totalVal}>{fmt(quote.monthly)} €/mois</td></tr>}
            </tbody>
          </table>
        </div>

        {quote.notes && (
          <div style={style.notes}>
            <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 6 }}>Notes</p>
            <p style={{ whiteSpace: 'pre-wrap', color: '#444' }}>{quote.notes}</p>
          </div>
        )}

        {isSigned && (
          <div style={style.signed}>
            <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 8 }}>Signé électroniquement</p>
            <p style={{ fontWeight: 600 }}>{quote.signedBy}</p>
            <p style={{ fontSize: 12, color: '#888' }}>Le {new Date(quote.signedAt).toLocaleString('fr-FR')}</p>
            {quote.signature && <img src={quote.signature} alt="Signature" style={{ maxHeight: 80, marginTop: 8 }} />}
          </div>
        )}

        <div className="no-print" style={{ marginTop: 32, display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'center' }}>
          {!isSigned && !isPaid && (
            <button onClick={() => setSigning(true)} className="nerixi-btn">✍️ Signer le devis</button>
          )}
          {isSigned && !isPaid && quote.paymentLinkUrl && (
            <a href={quote.paymentLinkUrl} className="nerixi-btn">💳 Payer maintenant ({fmt(upfront)} €)</a>
          )}
          <button onClick={downloadPdf} className="nerixi-btn-sec">📄 Télécharger PDF</button>
        </div>

        <div style={{ borderTop: '1px solid #eee', marginTop: 40, paddingTop: 20, textAlign: 'center', fontSize: 11, color: '#888' }}>
          <p><strong style={{ color: '#00c878' }}>NERIXI</strong> · nerixi.fr · info@nerixi.com</p>
        </div>
      </div>

      {signing && (
        <div className="no-print" onClick={() => setSigning(false)} style={style.modalBack}>
          <div onClick={e => e.stopPropagation()} style={style.modalCard}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Signature électronique</h3>
            <p style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>
              En signant ce devis, vous acceptez les conditions et engagez votre entreprise.
            </p>
            <input
              placeholder="Votre nom et fonction (ex: Jean Dupont, Gérant)"
              value={signedBy}
              onChange={e => setSignedBy(e.target.value)}
              style={style.input}
            />
            <div style={{ marginTop: 12 }}>
              <p style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.6, fontWeight: 700, marginBottom: 6 }}>Signature manuscrite</p>
              <canvas
                ref={canvasRef}
                onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
                onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp}
                style={{ width: '100%', height: 160, border: '2px dashed #ccc', borderRadius: 8, background: '#fafafa', cursor: 'crosshair', touchAction: 'none' }}
              />
              <button onClick={clearSig} style={{ ...style.btnSec, marginTop: 8, fontSize: 12, padding: '6px 12px' }}>Effacer</button>
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => setSigning(false)} className="nerixi-btn-sec">Annuler</button>
              <button onClick={submitSign} className="nerixi-btn">Signer définitivement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

const style = {
  page: { background: '#f4f4f4', minHeight: '100vh', padding: '40px 20px', fontFamily: "'Inter', system-ui, Arial, sans-serif", color: '#0a1628' },
  card: { maxWidth: 800, margin: '0 auto', background: 'white', borderRadius: 16, padding: 48, boxShadow: '0 12px 48px rgba(0,0,0,0.08)' },
  center: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Inter, sans-serif', color: '#666' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '2px solid #0a1628', paddingBottom: 20 },
  recipient: { marginTop: 24, padding: 16, background: '#f8f9fa', borderRadius: 8, borderLeft: '4px solid #00c878' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 12 },
  th: { padding: 12, fontSize: 12, textAlign: 'left', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 },
  td: { padding: 14, fontSize: 13.5, verticalAlign: 'top' },
  totalLabel: { padding: '6px 12px 6px 0', fontSize: 13, color: '#666', textAlign: 'right' },
  totalVal: { padding: '6px 0', fontSize: 13.5, textAlign: 'right', minWidth: 100, fontWeight: 500 },
  notes: { marginTop: 24, padding: 16, background: '#fffbeb', borderRadius: 8, borderLeft: '4px solid #f59e0b' },
  signed: { marginTop: 24, padding: 16, background: '#ecfdf5', borderRadius: 8, borderLeft: '4px solid #10b981' },
  badge: { display: 'inline-block', marginTop: 6, padding: '4px 10px', fontSize: 11, fontWeight: 700, color: 'white', borderRadius: 999, textTransform: 'uppercase', letterSpacing: 0.6 },
  modalBack: { position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 100 },
  modalCard: { background: 'white', borderRadius: 16, padding: 28, maxWidth: 500, width: '100%', boxShadow: '0 24px 60px rgba(0,0,0,0.3)' },
  input: { width: '100%', padding: '10px 12px', fontSize: 14, border: '1px solid #ddd', borderRadius: 8, fontFamily: 'inherit' },
  btnSec: { background: 'transparent', border: '1px solid #ddd', padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit' },
}
