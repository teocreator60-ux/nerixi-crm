'use client'
import { useEffect, useRef, useState } from 'react'

export default function CountUp({ value, prefix = '', suffix = '', decimals = 0, duration = 1200, format }) {
  const [display, setDisplay] = useState(value)
  const [bumping, setBumping] = useState(false)
  const prevRef = useRef(value)
  const rafRef = useRef(null)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    if (start === end) {
      setDisplay(end)
      return
    }
    const startTs = performance.now()
    setBumping(true)
    const tick = (now) => {
      const t = Math.min(1, (now - startTs) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const cur = start + (end - start) * eased
      setDisplay(cur)
      if (t < 1) rafRef.current = requestAnimationFrame(tick)
      else {
        setDisplay(end)
        prevRef.current = end
        setTimeout(() => setBumping(false), 400)
      }
    }
    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [value, duration])

  const out = format
    ? format(display)
    : `${prefix}${display.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}${suffix}`

  return <span className={`count-up ${bumping ? 'is-bumping' : ''}`}>{out}</span>
}
