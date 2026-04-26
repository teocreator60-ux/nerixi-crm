'use client'
import { useEffect, useState } from 'react'

function formatMoney(cents, currency = 'eur') {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: currency.toUpperCase() }).format((cents || 0) / 100)
  } catch { return `${((cents || 0) / 100).toFixed(2)}€` }
}

export function RealtimeToastStack({ toasts, onDismiss }) {
  return (
    <div className="rt-toast-stack">
      {toasts.map(t => <RealtimeToast key={t.id} toast={t} onDismiss={onDismiss} />)}
    </div>
  )
}

function RealtimeToast({ toast, onDismiss }) {
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      setLeaving(true)
      setTimeout(() => onDismiss(toast.id), 350)
    }, toast.duration || 6000)
    return () => clearTimeout(t)
  }, [toast.id])

  const isFail = toast.kind === 'fail'
  const isRefund = toast.kind === 'refund'
  const cls = `rt-toast ${leaving ? 'is-leaving' : ''} ${isFail ? 'is-fail' : ''} ${isRefund ? 'is-refund' : ''}`

  return (
    <div className={cls}>
      <span className="icon">{toast.icon || '💰'}</span>
      <div className="body">
        <p className="title">{toast.title}</p>
        {toast.amount != null && <p className="amount">{formatMoney(toast.amount)}</p>}
        {toast.sub && <p className="sub">{toast.sub}</p>}
      </div>
      <button className="close" onClick={() => { setLeaving(true); setTimeout(() => onDismiss(toast.id), 350) }}>✕</button>
    </div>
  )
}
