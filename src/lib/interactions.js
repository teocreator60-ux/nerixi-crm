'use client'
import { useEffect, useRef } from 'react'

// ─── Magnetic — élément qui suit légèrement le curseur ───────────
export function useMagnetic(strength = 0.18) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = e.clientX - r.left - r.width / 2
      const y = e.clientY - r.top - r.height / 2
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate(${x * strength}px, ${y * strength}px)`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [strength])
  return ref
}

// ─── Tilt 3D — rotation perspective au survol ────────────────────
export function useTilt3D({ max = 6, scale = 1.02, perspective = 800 } = {}) {
  const ref = useRef(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    let raf = 0
    const onMove = (e) => {
      const r = el.getBoundingClientRect()
      const x = (e.clientX - r.left) / r.width
      const y = (e.clientY - r.top) / r.height
      const rotY = (x - 0.5) * max * 2
      const rotX = -(y - 0.5) * max * 2
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        el.style.transform = `perspective(${perspective}px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(${scale})`
      })
    }
    const onLeave = () => {
      cancelAnimationFrame(raf)
      el.style.transform = ''
    }
    el.addEventListener('mousemove', onMove)
    el.addEventListener('mouseleave', onLeave)
    return () => {
      el.removeEventListener('mousemove', onMove)
      el.removeEventListener('mouseleave', onLeave)
      cancelAnimationFrame(raf)
    }
  }, [max, scale, perspective])
  return ref
}

// ─── Reveal on scroll — observe et ajoute is-visible ─────────────
export function useRevealOnScroll(deps = []) {
  useEffect(() => {
    if (typeof window === 'undefined') return
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible')
          obs.unobserve(e.target)
        }
      })
    }, { threshold: 0.08, rootMargin: '0px 0px -8% 0px' })
    const els = document.querySelectorAll('.reveal:not(.is-visible)')
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

// ─── Action Ripple — global click handler qui crée une vague ─────
export function useGlobalRipple() {
  useEffect(() => {
    if (typeof document === 'undefined') return
    const onClick = (e) => {
      const btn = e.target.closest('button, .btn-primary, .btn-secondary, a.btn-primary, a.btn-secondary')
      if (!btn) return
      if (btn.dataset.noRipple === 'true') return
      // skip very small icon buttons
      const r = btn.getBoundingClientRect()
      if (r.width < 24 || r.height < 24) return

      const ripple = document.createElement('span')
      ripple.className = 'ripple'
      const size = Math.max(r.width, r.height) * 1.2
      ripple.style.width = `${size}px`
      ripple.style.height = `${size}px`
      ripple.style.left = `${e.clientX - r.left - size / 2}px`
      ripple.style.top  = `${e.clientY - r.top - size / 2}px`

      const cs = getComputedStyle(btn)
      if (cs.position === 'static') btn.style.position = 'relative'
      const prevOverflow = btn.style.overflow
      btn.style.overflow = 'hidden'
      btn.appendChild(ripple)
      setTimeout(() => {
        ripple.remove()
        if (!btn.querySelector('.ripple')) btn.style.overflow = prevOverflow
      }, 700)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [])
}
