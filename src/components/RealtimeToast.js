'use client'
import { useEffect, useState } from 'react'

function formatMoney(cents, currency = 'eur') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100)
  } catch { return `${((cents || 0) / 100).toFixed(2)}€` }
}

export function RealtimeToastStack({ toasts, onDismiss }) {
  return (
    <div className="island-stack">
      {toasts.map(t => <Island key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

function Island({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onDismiss(toast.id), 420)
    }, toast.duration || 6000)
    return () => clearTimeout(t)
  }, [toast.id])

  const isFail = toast.kind === 'fail'
  const isRefund = toast.kind === 'refund'
  const cls = `island ${leaving ? 'is-leaving' : ''} ${isFail ? 'is-fail' : ''} ${isRefund ? 'is-refund' : ''}`

  const close = () => {
    setLeaving(true)
    setTimeout(() => onDismiss(toast.id), 420)
  }

  return (
    <div className={cls} role="status">
      <span className="icon">{toast.icon || '💰'}</span>
      <div className="body">
        <p className="title">{toast.title}</p>
        {toast.amount != null && <p className="amount">{formatMoney(toast.amount)}</p>}
        {toast.sub && <p className="sub">{toast.sub}</p>}
      </div>
      <button className="close" onClick={close} aria-label="Fermer">✕</button>
    </div>
  )
}
