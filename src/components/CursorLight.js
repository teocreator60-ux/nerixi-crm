'use client'
import { useEffect, useRef } from 'react'

export default function CursorLight() {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (typeof window === 'undefined') return
    if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return // skip on touch devices

    let raf = 0
    let visible = false
    const onMove = (e) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.left = `${e.clientX}px`
        el.style.top = `${e.clientY}px`
        if (!visible) {
          el.classList.add('is-visible')
          visible = true
        }
      })
    }
    const onLeave = () => {
      el.classList.remove('is-visible')
      visible = false
    }
    window.addEventListener('mousemove', onMove)
    document.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [])
  return <div ref={ref} className="cursor-light" aria-hidden />
}
