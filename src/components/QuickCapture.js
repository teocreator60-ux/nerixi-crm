'use client'
import { useEffect, useRef, useState } from 'react'

export default function QuickCapture({ onCaptured }) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)
  const recognitionRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80)
    if (!open) { setResult(null); setText('') }
  }, [open])

  // Raccourci global Cmd/Ctrl + Shift + N
  useEffect(() => {
    const handler = (e) => {
      const isMod = e.metaKey || e.ctrlKey
      if (isMod && e.shiftKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault()
        setOpen(o => !o)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const startVoice = () => {
    const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
    if (!SR) {
      alert('Ton navigateur ne supporte pas la dictée vocale. Utilise Chrome ou Safari.')
      return
    }
    const rec = new SR()
    rec.lang = 'fr-FR'
    rec.continuous = false
    rec.interimResults = true
    rec.onresult = (e) => {
      let final = ''
      for (let i = 0; i < e.results.length; i++) {
        final += e.results[i][0].transcript
      }
      setText(final)
    }
    rec.onend = () => setRecording(false)
    rec.onerror = () => setRecording(false)
    rec.start()
    recognitionRef.current = rec
    setRecording(true)
  }
  const stopVoice = () => {
    try { recognitionRef.current?.stop() } catch {}
    setRecording(false)
  }

  const submit = async (forceKind) => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, forceKind }),
      })
      const data = await res.json()
      if (data.error) {
        setResult({ error: data.error })
      } else {
        setResult(data)
        onCaptured?.(data)
      }
    } catch (e) {
      setResult({ error: e.message })
    }
    setSubmitting(false)
  }

  const reset = () => { setText(''); setResult(null) }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Capture rapide (⌘⇧N)"
        aria-label="Capture rapide"
        style={{
          position: 'fixed',
          bottom: 'calc(20px + env(safe-area-inset-bottom))',
          right: 'calc(20px + env(safe-area-inset-right))',
          zIndex: 90,
          width: 56, height: 56,
          background: 'linear-gradient(135deg, #00c878, #36e6c4)',
          border: 'none', borderRadius: '50%',
          color: '#06101f', fontWeight: 800, fontSize: 24,
          cursor: 'pointer',
          boxShadow: '0 8px 28px rgba(0, 200, 120, 0.5), 0 0 0 1px rgba(0, 232, 154, 0.3)',
          transition: 'transform 0.2s ease',
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >+</button>
    )
  }

  return (
    <>
      <div onClick={() => setOpen(false)} style={{
        position: 'fixed', inset: 0, background: 'rgba(10, 22, 40, 0.6)',
        backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        zIndex: 95, animation: 'fadeIn 0.2s ease',
      }} />
      <div style={{
        position: 'fixed',
        bottom: 'calc(20px + env(safe-area-inset-bottom))',
        right: 'calc(20px + env(safe-area-inset-right))',
        left: 'calc(20px + env(safe-area-inset-left))',
        maxWidth: 540, marginLeft: 'auto',
        zIndex: 100,
        background: 'linear-gradient(135deg, rgba(20,35,64,0.95), rgba(10,22,40,0.95))',
        border: '1px solid var(--nerixi-border-strong)',
        borderRadius: 18, padding: 18,
        boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
        backdropFilter: 'blur(16px)',
        animation: 'fadeInUp 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--nerixi-accent)' }}>⚡ Capture rapide</p>
          <button onClick={() => setOpen(false)} style={{ background: 'transparent', border: 'none', color: 'var(--nerixi-muted)', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>

        {!result && (
          <>
            <textarea
              ref={inputRef}
              rows={3}
              placeholder="Tape ou dicte… ex: 'RDV demain 14h Boulangerie Dupont' / 'Rappeler Jean lundi' / 'jean@test.com nouveau prospect restaurant'"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit() }}
              style={{ marginBottom: 10, fontSize: 15 }}
            />
            <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={recording ? stopVoice : startVoice}
                style={{
                  padding: '8px 14px', fontSize: 12.5, fontWeight: 600,
                  background: recording ? '#ff8a89' : 'rgba(10,22,40,0.6)',
                  border: `1px solid ${recording ? '#ff8a89' : 'var(--nerixi-border)'}`,
                  borderRadius: 10, cursor: 'pointer',
                  color: recording ? '#06101f' : 'var(--nerixi-text)',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                {recording ? '⏹ Arrêter' : '🎤 Dicter'}
              </button>
              <span style={{ fontSize: 11, color: 'var(--nerixi-muted)' }}>L'IA détecte automatiquement</span>
              <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                <button onClick={() => submit('task')} disabled={!text.trim() || submitting} className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }}>✅ Tâche</button>
                <button onClick={() => submit('prospect')} disabled={!text.trim() || submitting} className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }}>📥 Prospect</button>
                <button onClick={() => submit('event')} disabled={!text.trim() || submitting} className="btn-secondary" style={{ padding: '8px 12px', fontSize: 12 }}>📅 RDV</button>
                <button onClick={() => submit()} disabled={!text.trim() || submitting} className="btn-primary" style={{ padding: '8px 14px', fontSize: 13 }}>
                  {submitting ? '…' : 'Auto ⏎'}
                </button>
              </div>
            </div>
            <p style={{ fontSize: 10.5, color: 'var(--nerixi-muted)', marginTop: 10, textAlign: 'center' }}>
              💡 Raccourci : ⌘⇧N · Auto-détecte tâche / RDV / prospect
            </p>
          </>
        )}

        {result && !result.error && (
          <div style={{ padding: 14, background: 'rgba(0,200,120,0.10)', border: '1px solid rgba(0,200,120,0.3)', borderRadius: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--nerixi-accent)' }}>{result.message || 'Créé ✓'}</p>
            <p style={{ fontSize: 12, color: 'var(--nerixi-muted)', marginTop: 4 }}>"{result.raw}"</p>
            <div style={{ display: 'flex', gap: 6, marginTop: 12 }}>
              <button onClick={reset} className="btn-primary" style={{ padding: '7px 14px', fontSize: 12 }}>+ Encore</button>
              <button onClick={() => setOpen(false)} className="btn-secondary" style={{ padding: '7px 14px', fontSize: 12 }}>Fermer</button>
            </div>
          </div>
        )}

        {result?.error && (
          <div style={{ padding: 14, background: 'rgba(226,75,74,0.12)', border: '1px solid rgba(226,75,74,0.3)', borderRadius: 12, color: '#ff8a89', fontSize: 13 }}>
            ⚠ {result.error}
            <button onClick={reset} style={{ marginLeft: 12, background: 'transparent', border: 'none', color: 'inherit', textDecoration: 'underline', cursor: 'pointer' }}>Réessayer</button>
          </div>
        )}
      </div>
    </>
  )
}
