'use client'
import { useEffect, useRef } from 'react'

export default function AmbientBackground({ density = 36 }) {
  const canvasRef = useRef(null)
  const rafRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    const particles = []
    const colors = ['rgba(0,232,154,', 'rgba(54,230,196,', 'rgba(108,182,245,']

    function resize() {
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      ctx.scale(dpr, dpr)
    }

    function spawnAll() {
      particles.length = 0
      const W = window.innerWidth
      const H = window.innerHeight
      for (let i = 0; i < density; i++) {
        particles.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: 1 + Math.random() * 2.5,
          vx: (Math.random() - 0.5) * 0.18,
          vy: -0.05 - Math.random() * 0.18,
          life: Math.random(),
          color: colors[Math.floor(Math.random() * colors.length)],
          alpha: 0.15 + Math.random() * 0.35,
          phase: Math.random() * Math.PI * 2,
        })
      }
    }

    let prev = performance.now()
    function tick(now) {
      const dt = Math.min(50, now - prev) / 16
      prev = now
      const W = window.innerWidth
      const H = window.innerHeight
      ctx.clearRect(0, 0, W, H)

      for (const p of particles) {
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.phase += 0.012 * dt
        const wobble = Math.sin(p.phase) * 0.4
        p.x += wobble * 0.2

        if (p.y < -10 || p.x < -10 || p.x > W + 10) {
          p.x = Math.random() * W
          p.y = H + 10
          p.r = 1 + Math.random() * 2.5
          p.vy = -0.05 - Math.random() * 0.18
          p.alpha = 0.15 + Math.random() * 0.35
        }

        const a = p.alpha * (0.6 + 0.4 * Math.sin(p.phase))
        ctx.beginPath()
        ctx.fillStyle = `${p.color}${a})`
        ctx.shadowColor = `${p.color}0.6)`
        ctx.shadowBlur = 8
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    resize()
    spawnAll()
    rafRef.current = requestAnimationFrame(tick)
    window.addEventListener('resize', () => { resize(); spawnAll() })

    return () => {
      cancelAnimationFrame(rafRef.current)
    }
  }, [density])

  return <canvas ref={canvasRef} className="ambient-canvas" aria-hidden />
}
