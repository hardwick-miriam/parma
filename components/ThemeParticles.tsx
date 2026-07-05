'use client'

import { useEffect, useRef } from 'react'
import type { Theme } from './ThemeProvider'

interface Config {
  count: number
  render: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, t: number, w: number, h: number) => void
}

// ── Midnight Ocean: rising bubbles ──────────────────────────────────────
interface Bubble { x: number; y: number; r: number; speed: number; wobble: number; phase: number }

function makeBubble(w: number, h: number): Bubble {
  return { x: Math.random() * w, y: h + Math.random() * h, r: 2 + Math.random() * 5, speed: 0.3 + Math.random() * 0.8, wobble: 0.3 + Math.random(), phase: Math.random() * Math.PI * 2 }
}

function midnightOceanConfig(canvas: HTMLCanvasElement): Config {
  const MAX = 30
  const bubbles: Bubble[] = Array.from({ length: MAX }, () => makeBubble(canvas.width, canvas.height))
  return {
    count: MAX,
    render(c, ctx, t, w, h) {
      ctx.clearRect(0, 0, w, h)
      for (const b of bubbles) {
        b.y -= b.speed
        const x = b.x + Math.sin(t * 0.001 + b.phase) * b.wobble * 8
        if (b.y + b.r < 0) Object.assign(b, makeBubble(w, h))
        const alpha = Math.max(0, Math.min(1, (h - b.y) / h)) * 0.5
        ctx.beginPath()
        ctx.arc(x, b.y, b.r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(56,189,248,${alpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    },
  }
}

// ── Synthwave: neon scanline + star field ────────────────────────────────
interface Star { x: number; y: number; r: number; phase: number; speed: number }

function synthwaveConfig(canvas: HTMLCanvasElement): Config {
  const MAX = 25
  const stars: Star[] = Array.from({ length: MAX }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 0.5 + Math.random() * 1.5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.5 + Math.random() * 2,
  }))
  let scanY = 0
  return {
    count: MAX,
    render(c, ctx, t, w, h) {
      ctx.clearRect(0, 0, w, h)
      // Stars
      for (const s of stars) {
        const alpha = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * s.speed * 0.002 + s.phase))
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(232,121,249,${alpha * 0.6})`
        ctx.fill()
      }
      // Scanline
      scanY = (scanY + 0.5) % h
      const grad = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30)
      grad.addColorStop(0, 'rgba(232,121,249,0)')
      grad.addColorStop(0.5, 'rgba(232,121,249,0.06)')
      grad.addColorStop(1, 'rgba(232,121,249,0)')
      ctx.fillStyle = grad
      ctx.fillRect(0, scanY - 30, w, 60)
    },
  }
}

// ── Old Money: golden dust motes ─────────────────────────────────────────
interface Mote { x: number; y: number; size: number; vx: number; vy: number; alpha: number; life: number; maxLife: number }

function oldMoneyConfig(canvas: HTMLCanvasElement): Config {
  const MAX = 20
  const motes: Mote[] = Array.from({ length: MAX }, () => spawnMote(canvas.width, canvas.height))
  function spawnMote(w: number, h: number): Mote {
    const life = 3000 + Math.random() * 4000
    return { x: Math.random() * w, y: h * 0.3 + Math.random() * h * 0.7, size: 1 + Math.random() * 2, vx: (Math.random() - 0.5) * 0.3, vy: -(0.1 + Math.random() * 0.3), alpha: 0, life, maxLife: life }
  }
  let last = 0
  return {
    count: MAX,
    render(c, ctx, t, w, h) {
      const dt = last ? t - last : 16; last = t
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy; m.life -= dt
        const progress = 1 - m.life / m.maxLife
        m.alpha = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1
        if (m.life <= 0) Object.assign(m, spawnMote(w, h))
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(201,168,76,${m.alpha * 0.4})`
        ctx.fill()
      }
    },
  }
}

// ── Dark Academia: floating dust motes (amber) ───────────────────────────
function darkAcademiaConfig(canvas: HTMLCanvasElement): Config {
  const MAX = 18
  const motes: Mote[] = Array.from({ length: MAX }, () => spawnDA(canvas.width, canvas.height))
  function spawnDA(w: number, h: number): Mote {
    const life = 4000 + Math.random() * 5000
    return { x: Math.random() * w, y: h * 0.4 + Math.random() * h * 0.6, size: 0.8 + Math.random() * 1.5, vx: (Math.random() - 0.5) * 0.2, vy: -(0.08 + Math.random() * 0.2), alpha: 0, life, maxLife: life }
  }
  let last = 0
  return {
    count: MAX,
    render(c, ctx, t, w, h) {
      const dt = last ? t - last : 16; last = t
      ctx.clearRect(0, 0, w, h)
      for (const m of motes) {
        m.x += m.vx; m.y += m.vy; m.life -= dt
        const progress = 1 - m.life / m.maxLife
        m.alpha = progress < 0.1 ? progress * 10 : progress > 0.8 ? (1 - progress) * 5 : 1
        if (m.life <= 0) Object.assign(m, spawnDA(w, h))
        ctx.beginPath()
        ctx.arc(m.x, m.y, m.size, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(212,147,10,${m.alpha * 0.35})`
        ctx.fill()
      }
    },
  }
}

const THEME_CONFIGS: Partial<Record<Theme, (canvas: HTMLCanvasElement) => Config>> = {
  'midnight-ocean': midnightOceanConfig,
  'synthwave':      synthwaveConfig,
  'old-money':      oldMoneyConfig,
  'dark-academia':  darkAcademiaConfig,
}

export function ThemeParticles({ theme, reduced }: { theme: Theme; reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    const factory = THEME_CONFIGS[theme]
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

    const config = factory(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let raf = 0
    function loop(t: number) {
      if (!canvas) return
      config.render(canvas, ctx!, t, window.innerWidth, window.innerHeight)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [theme, reduced])

  if (reduced) return null
  if (!THEME_CONFIGS[theme]) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0, opacity: 0.8 }}
      aria-hidden
    />
  )
}
