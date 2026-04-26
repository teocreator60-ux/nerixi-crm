'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

export default function Modal({ children, onClose, zIndex = 200, contentClass, contentStyle }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <div className="modal-backdrop" onClick={onClose} style={{ zIndex }}>
      <div className={`card modal-card ${contentClass || ''}`} onClick={e => e.stopPropagation()} style={contentStyle}>
        {children}
      </div>
    </div>,
    document.body
  )
}
