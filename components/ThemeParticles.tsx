'use client'

import { useEffect, useRef } from 'react'
import type { Theme } from './ThemeProvider'

// ─── Shared helpers ────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number) { return a + (b - a) * t }

// ─── Midnight Ocean: rising bubbles + bioluminescent light rays ───────────────

interface Bubble { x: number; y: number; r: number; speed: number; wobble: number; phase: number }
interface Ray { x: number; angle: number; width: number; phase: number; speed: number }

function midnightOcean(canvas: HTMLCanvasElement) {
  const MAX_BUBBLES = 28
  const MAX_RAYS = 6
  const bubbles: Bubble[] = Array.from({ length: MAX_BUBBLES }, () => spawnBubble(canvas.width, canvas.height))
  const rays: Ray[] = Array.from({ length: MAX_RAYS }, () => spawnRay(canvas.width))

  function spawnBubble(w: number, h: number): Bubble {
    return {
      x: Math.random() * w,
      y: h + Math.random() * h,
      r: 2 + Math.random() * 5,
      speed: 0.25 + Math.random() * 0.7,
      wobble: 0.3 + Math.random(),
      phase: Math.random() * Math.PI * 2,
    }
  }
  function spawnRay(w: number): Ray {
    return {
      x: Math.random() * w,
      angle: -0.15 + Math.random() * 0.3, // slight diagonal
      width: 30 + Math.random() * 60,
      phase: Math.random() * Math.PI * 2,
      speed: 0.0003 + Math.random() * 0.0003,
    }
  }

  return (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h)

    // Light rays — slow wavering vertical beams
    for (const ray of rays) {
      const sway = Math.sin(t * ray.speed + ray.phase) * 40
      const alpha = 0.018 + 0.012 * Math.sin(t * 0.0005 + ray.phase)
      const x = ray.x + sway
      const grad = ctx.createLinearGradient(x, 0, x, h)
      grad.addColorStop(0, `rgba(34,211,238,${alpha})`)
      grad.addColorStop(0.6, `rgba(34,211,238,${alpha * 0.4})`)
      grad.addColorStop(1, 'rgba(34,211,238,0)')
      ctx.save()
      ctx.translate(x, 0)
      ctx.rotate(ray.angle)
      ctx.fillStyle = grad
      ctx.fillRect(-ray.width / 2, 0, ray.width, h)
      ctx.restore()
    }

    // Bubbles
    for (const b of bubbles) {
      b.y -= b.speed
      const bx = b.x + Math.sin(t * 0.001 + b.phase) * b.wobble * 8
      if (b.y + b.r < 0) Object.assign(b, spawnBubble(w, h))
      const alpha = Math.max(0, Math.min(1, (h - b.y) / h)) * 0.45
      ctx.beginPath()
      ctx.arc(bx, b.y, b.r, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(56,189,248,${alpha})`
      ctx.lineWidth = 1
      ctx.stroke()
      // Highlight
      ctx.beginPath()
      ctx.arc(bx - b.r * 0.3, b.y - b.r * 0.3, b.r * 0.3, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(200,240,255,${alpha * 0.6})`
      ctx.fill()
    }
  }
}

// ─── Synthwave: perspective grid + star field + neon pulse ────────────────────

interface SynthStar { x: number; y: number; r: number; phase: number; speed: number }
interface NeonPulse { x: number; y: number; r: number; maxR: number; born: number; duration: number }

function synthwave(canvas: HTMLCanvasElement) {
  const W0 = canvas.width
  const H0 = canvas.height
  const MAX_STARS = 60
  const stars: SynthStar[] = Array.from({ length: MAX_STARS }, () => ({
    x: Math.random() * W0,
    y: Math.random() * H0 * 0.5,
    r: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.4 + Math.random() * 1.2,
  }))
  const pulses: NeonPulse[] = []
  let nextPulse = 2000

  return (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    ctx.clearRect(0, 0, w, h)

    const HORIZON_Y = h * 0.52
    const VP_X = w / 2

    // ── Star field (upper half) ───────────────────────────────────────────────
    for (const s of stars) {
      const alpha = 0.15 + 0.45 * (0.5 + 0.5 * Math.sin(t * s.speed * 0.002 + s.phase))
      const sy = s.y * (HORIZON_Y / H0) * (h / H0)
      ctx.beginPath()
      ctx.arc(s.x * (w / W0), sy, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(232,121,249,${alpha})`
      ctx.fill()
    }

    // ── Perspective grid (lower half, scrolling toward viewer) ────────────────
    const scroll = (t * 0.035) % 1  // 0..1, wraps
    const GRID_COLS = 12
    const GRID_ROWS = 14
    const BOTTOM_Y = h + 2

    ctx.save()
    ctx.beginPath()
    ctx.rect(0, HORIZON_Y, w, BOTTOM_Y - HORIZON_Y)
    ctx.clip()

    // Vertical grid lines radiating from vanishing point
    for (let i = 0; i <= GRID_COLS; i++) {
      const t_val = i / GRID_COLS
      const bottomX = t_val * w
      const alpha = 0.04 + 0.06 * Math.abs(t_val - 0.5) / 0.5
      ctx.beginPath()
      ctx.moveTo(VP_X, HORIZON_Y)
      ctx.lineTo(bottomX, BOTTOM_Y)
      ctx.strokeStyle = `rgba(232,121,249,${alpha})`
      ctx.lineWidth = 1
      ctx.stroke()
    }

    // Horizontal lines — spaced in perspective, scrolling
    for (let row = 0; row < GRID_ROWS; row++) {
      const baseT = (row / GRID_ROWS + scroll) % 1
      // Perspective mapping: t=0 at horizon, t=1 at bottom
      const perspT = baseT * baseT * baseT  // cubic easing = more lines near horizon
      const y = HORIZON_Y + perspT * (BOTTOM_Y - HORIZON_Y)
      if (y < HORIZON_Y || y > BOTTOM_Y) continue

      const xSpan = perspT * (w / 2)
      const alpha = perspT * 0.12
      ctx.beginPath()
      ctx.moveTo(VP_X - xSpan, y)
      ctx.lineTo(VP_X + xSpan, y)
      ctx.strokeStyle = `rgba(34,211,238,${alpha})`
      ctx.lineWidth = 0.8
      ctx.stroke()
    }

    // Horizon glow line
    const horizGrad = ctx.createLinearGradient(0, HORIZON_Y - 1, 0, HORIZON_Y + 3)
    horizGrad.addColorStop(0, 'rgba(232,121,249,0)')
    horizGrad.addColorStop(0.5, 'rgba(232,121,249,0.25)')
    horizGrad.addColorStop(1, 'rgba(232,121,249,0)')
    ctx.fillStyle = horizGrad
    ctx.fillRect(0, HORIZON_Y - 1, w, 4)

    ctx.restore()

    // ── Neon pulse blooms ─────────────────────────────────────────────────────
    if (t > nextPulse) {
      pulses.push({
        x: VP_X + (Math.random() - 0.5) * w * 0.6,
        y: HORIZON_Y + Math.random() * (h - HORIZON_Y) * 0.3,
        r: 0,
        maxR: 60 + Math.random() * 80,
        born: t,
        duration: 1500 + Math.random() * 1000,
      })
      nextPulse = t + 3000 + Math.random() * 4000
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]
      const age = t - p.born
      if (age > p.duration) { pulses.splice(i, 1); continue }
      const prog = age / p.duration
      const r = p.maxR * Math.sin(prog * Math.PI)
      const alpha = 0.08 * Math.sin(prog * Math.PI)
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r)
      grad.addColorStop(0, `rgba(232,121,249,${alpha * 2})`)
      grad.addColorStop(0.5, `rgba(34,211,238,${alpha})`)
      grad.addColorStop(1, 'rgba(34,211,238,0)')
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fill()
    }
  }
}

// ─── Old Money: golden dust motes + diagonal light shaft ─────────────────────

interface Mote { x: number; y: number; size: number; vx: number; vy: number; alpha: number; life: number; maxLife: number }

function oldMoney(canvas: HTMLCanvasElement) {
  const MAX = 24

  function spawnMote(w: number, h: number): Mote {
    const life = 4000 + Math.random() * 5000
    return {
      x: Math.random() * w,
      y: h * 0.2 + Math.random() * h * 0.8,
      size: 1 + Math.random() * 2.5,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -(0.08 + Math.random() * 0.25),
      alpha: 0,
      life,
      maxLife: life,
    }
  }

  const motes: Mote[] = Array.from({ length: MAX }, () => spawnMote(canvas.width, canvas.height))
  let lastT = 0

  return (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    const dt = lastT ? t - lastT : 16; lastT = t
    ctx.clearRect(0, 0, w, h)

    // Diagonal warm light shaft from top-right
    const shaftPulse = 0.5 + 0.5 * Math.sin(t * 0.0004)
    ctx.save()
    ctx.translate(w * 0.72, 0)
    ctx.rotate(0.22)
    const shaftGrad = ctx.createLinearGradient(0, 0, 160, 0)
    shaftGrad.addColorStop(0, `rgba(255,210,120,0)`)
    shaftGrad.addColorStop(0.15, `rgba(255,210,120,${0.035 * shaftPulse})`)
    shaftGrad.addColorStop(0.5, `rgba(255,220,140,${0.045 * shaftPulse})`)
    shaftGrad.addColorStop(0.85, `rgba(255,210,120,${0.035 * shaftPulse})`)
    shaftGrad.addColorStop(1, `rgba(255,210,120,0)`)
    ctx.fillStyle = shaftGrad
    ctx.fillRect(-80, -50, 160, h * 1.5)
    ctx.restore()

    // Dust motes
    for (const m of motes) {
      m.x += m.vx; m.y += m.vy; m.life -= dt
      const progress = 1 - m.life / m.maxLife
      m.alpha = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1
      if (m.life <= 0) Object.assign(m, spawnMote(w, h))
      // Each mote has a soft glow
      const glow = ctx.createRadialGradient(m.x, m.y, 0, m.x, m.y, m.size * 3)
      glow.addColorStop(0, `rgba(220,180,80,${m.alpha * 0.35})`)
      glow.addColorStop(1, 'rgba(220,180,80,0)')
      ctx.fillStyle = glow
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.size * 3, 0, Math.PI * 2)
      ctx.fill()
      // Core
      ctx.beginPath()
      ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(240,200,100,${m.alpha * 0.55})`
      ctx.fill()
    }
  }
}

// ─── Dark Academia: falling leaves + candle flicker ──────────────────────────

interface Leaf {
  x: number; y: number
  size: number; rotation: number; rotSpeed: number
  vx: number; vy: number
  swayAmp: number; swayFreq: number; swayPhase: number
  color: string; alpha: number; life: number; maxLife: number
}

const LEAF_COLORS = [
  'rgba(160,80,20',   // burnt orange
  'rgba(140,60,10',   // dark brown-orange
  'rgba(120,50,10',   // deep brown
  'rgba(180,100,30',  // amber
  'rgba(100,50,20',   // dark sienna
]

function spawnLeaf(w: number, h: number): Leaf {
  const life = 6000 + Math.random() * 6000
  const size = 6 + Math.random() * 8
  return {
    x: -size + Math.random() * (w + size * 2),
    y: -size - Math.random() * h * 0.3,
    size,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 0.015,
    vx: (Math.random() - 0.4) * 0.4,
    vy: 0.4 + Math.random() * 0.6,
    swayAmp: 20 + Math.random() * 30,
    swayFreq: 0.0005 + Math.random() * 0.0006,
    swayPhase: Math.random() * Math.PI * 2,
    color: LEAF_COLORS[Math.floor(Math.random() * LEAF_COLORS.length)],
    alpha: 0.55 + Math.random() * 0.35,
    life,
    maxLife: life,
  }
}

function drawLeaf(ctx: CanvasRenderingContext2D, leaf: Leaf) {
  const prog = 1 - leaf.life / leaf.maxLife
  const alpha = leaf.alpha * (prog < 0.05 ? prog / 0.05 : prog > 0.85 ? (1 - prog) / 0.15 : 1)
  ctx.save()
  ctx.translate(leaf.x, leaf.y)
  ctx.rotate(leaf.rotation)
  ctx.beginPath()
  // Simple ellipse-leaf shape with a pointy tip
  ctx.ellipse(0, 0, leaf.size * 0.45, leaf.size, 0, 0, Math.PI * 2)
  ctx.fillStyle = `${leaf.color},${alpha})`
  ctx.fill()
  // Midrib
  ctx.beginPath()
  ctx.moveTo(0, -leaf.size)
  ctx.lineTo(0, leaf.size)
  ctx.strokeStyle = `rgba(80,30,5,${alpha * 0.4})`
  ctx.lineWidth = 0.8
  ctx.stroke()
  ctx.restore()
}

function darkAcademia(canvas: HTMLCanvasElement) {
  const MAX_LEAVES = 20

  const leaves: Leaf[] = Array.from({ length: MAX_LEAVES }, () => {
    const l = spawnLeaf(canvas.width, canvas.height)
    l.y = Math.random() * canvas.height // start already on screen
    return l
  })

  let lastT = 0

  return (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => {
    const dt = lastT ? t - lastT : 16; lastT = t
    ctx.clearRect(0, 0, w, h)

    // Candle flicker — warm pool of light at bottom-center
    const flicker = 0.7 + 0.3 * Math.sin(t * 0.007 + Math.sin(t * 0.019) * 2)
    const candleGrad = ctx.createRadialGradient(w * 0.5, h, 0, w * 0.5, h, h * 0.55)
    candleGrad.addColorStop(0, `rgba(255,160,40,${0.06 * flicker})`)
    candleGrad.addColorStop(0.4, `rgba(200,100,20,${0.035 * flicker})`)
    candleGrad.addColorStop(1, 'rgba(200,100,20,0)')
    ctx.fillStyle = candleGrad
    ctx.fillRect(0, 0, w, h)

    // Falling leaves
    for (const leaf of leaves) {
      leaf.life -= dt
      leaf.y += leaf.vy
      leaf.x += leaf.vx + Math.sin(t * leaf.swayFreq + leaf.swayPhase) * leaf.swayAmp * 0.012
      leaf.rotation += leaf.rotSpeed

      if (leaf.life <= 0 || leaf.y > h + leaf.size * 2) {
        Object.assign(leaf, spawnLeaf(w, h))
      }
      drawLeaf(ctx, leaf)
    }
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Renderer = (ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void

const FACTORIES: Partial<Record<Theme, (canvas: HTMLCanvasElement) => Renderer>> = {
  'midnight-ocean': midnightOcean,
  'synthwave':      synthwave,
  'old-money':      oldMoney,
  'dark-academia':  darkAcademia,
}

export function ThemeParticles({ theme, reduced }: { theme: Theme; reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    const factory = FACTORIES[theme]
    if (!factory) return

    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    // Reinitialise renderer after resize (canvas dimensions changed)
    let render = factory(canvas)

    let raf = 0
    let paused = false

    function loop(t: number) {
      if (!canvas || paused) { raf = requestAnimationFrame(loop); return }
      const ctx = canvas.getContext('2d')
      if (ctx) render(ctx, t, window.innerWidth, window.innerHeight)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    function onResize() {
      resize()
      render = factory!(canvas!)
    }
    window.removeEventListener('resize', resize)
    window.addEventListener('resize', onResize)

    function onVisibility() {
      paused = document.hidden
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [theme, reduced])

  if (reduced) return null
  if (!FACTORIES[theme]) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.9 }}
      aria-hidden
    />
  )
}
