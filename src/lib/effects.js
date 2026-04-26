'use client'

const COLORS = ['#00e89a', '#36e6c4', '#00c878', '#fac775', '#b89cff', '#6cb6f5', '#ffffff']

export function fireConfetti({ x, y, count = 90, spread = 70 } = {}) {
  if (typeof window === 'undefined') return
  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight / 2

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const particles = Array.from({ length: count }, () => {
    const angle = (-Math.PI / 2) + (Math.random() - 0.5) * (spread * Math.PI / 180) * 2
    const speed = 9 + Math.random() * 11
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 4,
      vy: Math.sin(angle) * speed,
      g: 0.32 + Math.random() * 0.1,
      w: 6 + Math.random() * 6,
      h: 3 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.4,
      life: 1,
      decay: 0.006 + Math.random() * 0.006,
    }
  })

  let raf = 0
  const tick = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const p of particles) {
      if (p.life <= 0) continue
      alive = true
      p.x += p.vx; p.y += p.vy; p.vy += p.g; p.rot += p.vrot
      p.life -= p.decay
      p.vx *= 0.99
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
      ctx.restore()
    }
    if (alive) raf = requestAnimationFrame(tick)
    else canvas.remove()
  }
  tick()
}

export function fireConfettiFromElement(el, opts = {}) {
  if (!el) return fireConfetti(opts)
  const r = el.getBoundingClientRect()
  fireConfetti({ x: r.left + r.width / 2, y: r.top + r.height / 2, ...opts })
}

// ────────────────────────────────────────────────────────
// 🪙 Pluie d'or — premier paiement client
// ────────────────────────────────────────────────────────
export function fireGoldRain({ duration = 4000 } = {}) {
  if (typeof window === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const start = performance.now()
  const goldColors = ['#ffd700', '#ffea00', '#ffaa00', '#ffec80', '#fff7c0']
  const coins = []

  function spawn() {
    coins.push({
      x: Math.random() * canvas.width,
      y: -20,
      r: 7 + Math.random() * 9,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 3 + Math.random() * 4,
      rot: Math.random() * Math.PI * 2,
      vrot: (Math.random() - 0.5) * 0.2,
      color: goldColors[Math.floor(Math.random() * goldColors.length)],
      flip: Math.random() * Math.PI * 2,
      vflip: 0.2 + Math.random() * 0.2,
    })
  }

  function tick(now) {
    const elapsed = now - start
    if (elapsed < duration - 800) {
      for (let i = 0; i < 3; i++) spawn()
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    for (let i = coins.length - 1; i >= 0; i--) {
      const c = coins[i]
      c.x += c.vx; c.y += c.vy; c.rot += c.vrot; c.flip += c.vflip
      if (c.y > canvas.height + 30) { coins.splice(i, 1); continue }
      ctx.save()
      ctx.translate(c.x, c.y)
      ctx.rotate(c.rot)
      const scale = Math.abs(Math.sin(c.flip))
      ctx.scale(scale, 1)
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, c.r)
      grad.addColorStop(0, '#fff7c0')
      grad.addColorStop(0.5, c.color)
      grad.addColorStop(1, '#b8860b')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(0, 0, c.r, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = 'rgba(184,134,11,0.5)'
      ctx.font = `bold ${c.r}px sans-serif`
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      ctx.fillText('€', 0, 0)
      ctx.restore()
    }

    if (coins.length > 0 || elapsed < duration) requestAnimationFrame(tick)
    else canvas.remove()
  }
  requestAnimationFrame(tick)
}

// ────────────────────────────────────────────────────────
// ⭐ Explosion d'étoiles — milestone MRR
// ────────────────────────────────────────────────────────
export function fireStarBurst({ x, y, count = 60 } = {}) {
  if (typeof window === 'undefined') return
  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight / 2

  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const stars = Array.from({ length: count }, () => {
    const angle = Math.random() * Math.PI * 2
    const speed = 5 + Math.random() * 9
    return {
      x: cx, y: cy,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      g: 0.04,
      size: 6 + Math.random() * 8,
      rot: 0, vrot: (Math.random() - 0.5) * 0.25,
      color: ['#ffd700', '#36e6c4', '#00e89a', '#fff'][Math.floor(Math.random() * 4)],
      life: 1, decay: 0.005 + Math.random() * 0.006,
    }
  })

  function star(ctx, size) {
    ctx.beginPath()
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - Math.PI / 2
      ctx.lineTo(Math.cos(a) * size, Math.sin(a) * size)
      const a2 = a + Math.PI / 5
      ctx.lineTo(Math.cos(a2) * size * 0.45, Math.sin(a2) * size * 0.45)
    }
    ctx.closePath()
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    let alive = false
    for (const s of stars) {
      if (s.life <= 0) continue
      alive = true
      s.x += s.vx; s.y += s.vy; s.vy += s.g; s.rot += s.vrot
      s.life -= s.decay
      ctx.save()
      ctx.translate(s.x, s.y)
      ctx.rotate(s.rot)
      ctx.fillStyle = s.color
      ctx.shadowColor = s.color
      ctx.shadowBlur = 14
      ctx.globalAlpha = Math.max(0, s.life)
      star(ctx, s.size)
      ctx.fill()
      ctx.restore()
    }
    if (alive) requestAnimationFrame(tick)
    else canvas.remove()
  }
  tick()
}

// ────────────────────────────────────────────────────────
// 🎆 Fireworks — Kanban actif / signature
// ────────────────────────────────────────────────────────
export function fireFireworks({ bursts = 4 } = {}) {
  if (typeof window === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999'
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')

  const W = canvas.width, H = canvas.height
  const palette = [['#ff5e8d','#ffaad4'], ['#00e89a','#a8ffdc'], ['#fac775','#fff0a8'], ['#6cb6f5','#cce6ff'], ['#b89cff','#e0d5ff']]
  const particles = []
  let scheduled = 0

  function explode(x, y, colors) {
    const count = 36 + Math.floor(Math.random() * 24)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const speed = 4 + Math.random() * 7
      particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        g: 0.08, drag: 0.985,
        color: colors[Math.floor(Math.random() * colors.length)],
        life: 1,
        decay: 0.012 + Math.random() * 0.012,
      })
    }
  }

  function scheduleBurst(delay) {
    setTimeout(() => {
      const colors = palette[Math.floor(Math.random() * palette.length)]
      const x = W * (0.2 + Math.random() * 0.6)
      const y = H * (0.2 + Math.random() * 0.4)
      explode(x, y, colors)
      scheduled--
    }, delay)
  }

  for (let i = 0; i < bursts; i++) { scheduleBurst(i * 380); scheduled++ }

  ctx.fillStyle = 'rgba(6,16,31,0)'
  function tick() {
    ctx.fillStyle = 'rgba(6,16,31,0.18)'
    ctx.fillRect(0, 0, W, H)
    let alive = false
    for (const p of particles) {
      if (p.life <= 0) continue
      alive = true
      p.vx *= p.drag; p.vy *= p.drag; p.vy += p.g
      p.x += p.vx; p.y += p.vy
      p.life -= p.decay
      ctx.beginPath()
      ctx.fillStyle = p.color
      ctx.shadowColor = p.color
      ctx.shadowBlur = 10
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
    if (alive || scheduled > 0) requestAnimationFrame(tick)
    else canvas.remove()
  }
  tick()
}

// ────────────────────────────────────────────────────────
// ✅ Checkmark vert flottant — tâche urgente terminée
// ────────────────────────────────────────────────────────
export function fireCheckmark({ x, y } = {}) {
  if (typeof window === 'undefined') return
  const cx = x ?? window.innerWidth / 2
  const cy = y ?? window.innerHeight * 0.7

  const el = document.createElement('div')
  el.style.cssText = `
    position: fixed; left: ${cx - 50}px; top: ${cy - 50}px;
    width: 100px; height: 100px;
    pointer-events: none; z-index: 9999;
    display: flex; align-items: center; justify-content: center;
    border-radius: 50%;
    background: linear-gradient(135deg, #00e89a, #36e6c4);
    color: #06101f;
    font-size: 56px; font-weight: 900;
    box-shadow: 0 12px 40px rgba(0, 200, 120, 0.55), 0 0 0 4px rgba(0, 232, 154, 0.25);
    animation: nx-check-rise 1.4s cubic-bezier(0.22, 1, 0.36, 1) forwards;
    will-change: transform, opacity;
  `
  el.innerHTML = '✓'

  if (!document.getElementById('nx-check-style')) {
    const s = document.createElement('style')
    s.id = 'nx-check-style'
    s.textContent = `@keyframes nx-check-rise {
      0%   { transform: scale(0) translateY(0); opacity: 0; }
      30%  { transform: scale(1.2) translateY(-30px); opacity: 1; }
      55%  { transform: scale(1) translateY(-60px); opacity: 1; }
      100% { transform: scale(0.8) translateY(-160px); opacity: 0; }
    }`
    document.head.appendChild(s)
  }
  document.body.appendChild(el)
  setTimeout(() => el.remove(), 1500)
}

let audioCtxSingleton = null
function getAudioCtx() {
  if (typeof window === 'undefined') return null
  if (!audioCtxSingleton) {
    try { audioCtxSingleton = new (window.AudioContext || window.webkitAudioContext)() } catch { return null }
  }
  if (audioCtxSingleton.state === 'suspended') audioCtxSingleton.resume().catch(() => {})
  return audioCtxSingleton
}

export function playChaching(volume = 0.18) {
  const ctx = getAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime

  const tones = [
    { f: 1320, t: 0.00, type: 'triangle', dur: 0.42, gain: volume },
    { f: 1760, t: 0.07, type: 'triangle', dur: 0.50, gain: volume * 0.85 },
    { f: 2640, t: 0.14, type: 'sine',     dur: 0.45, gain: volume * 0.55 },
  ]
  for (const t of tones) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = t.type
    o.frequency.value = t.f
    o.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0, now + t.t)
    g.gain.linearRampToValueAtTime(t.gain, now + t.t + 0.012)
    g.gain.exponentialRampToValueAtTime(0.001, now + t.t + t.dur)
    o.start(now + t.t)
    o.stop(now + t.t + t.dur + 0.05)
  }
}

export function playSoftChime(volume = 0.12) {
  const ctx = getAudioCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const tones = [
    { f: 880, t: 0, dur: 0.4, gain: volume },
    { f: 1175, t: 0.06, dur: 0.45, gain: volume * 0.7 },
  ]
  for (const t of tones) {
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = 'sine'
    o.frequency.value = t.f
    o.connect(g); g.connect(ctx.destination)
    g.gain.setValueAtTime(0, now + t.t)
    g.gain.linearRampToValueAtTime(t.gain, now + t.t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.001, now + t.t + t.dur)
    o.start(now + t.t)
    o.stop(now + t.t + t.dur + 0.05)
  }
}

const SOUND_KEY = 'nerixi-sound-on'

export function isSoundEnabled() {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(SOUND_KEY) !== '0'
}

export function setSoundEnabled(on) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SOUND_KEY, on ? '1' : '0')
}
