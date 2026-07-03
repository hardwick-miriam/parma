'use client'

import { useEffect, useRef } from 'react'

interface Bird {
  x: number
  y: number
  speed: number
  wingPhase: number
  wingSpeed: number
  scale: number
  opacity: number
}

function makeBird(W: number, H: number): Bird {
  return {
    x: -80 - Math.random() * 200,
    y: Math.random() * H * 0.7 + H * 0.05,
    speed: 0.8 + Math.random() * 1.8,
    wingPhase: Math.random() * Math.PI * 2,
    wingSpeed: 2 + Math.random() * 3,
    scale: 0.6 + Math.random() * 0.8,
    opacity: 0.3 + Math.random() * 0.5,
  }
}

function drawBird(ctx: CanvasRenderingContext2D, bird: Bird, t: number) {
  const { x, y, wingPhase, wingSpeed, scale, opacity } = bird
  const flap = Math.sin(t * wingSpeed + wingPhase)
  const wingY = flap * 10 * scale

  ctx.save()
  ctx.translate(x, y)
  ctx.globalAlpha = opacity
  ctx.strokeStyle = '#000000'
  ctx.lineWidth = 1.5 * scale
  ctx.lineCap = 'round'

  // Left wing — bezier arc
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-18 * scale, wingY - 6 * scale, -34 * scale, wingY + 2 * scale)
  ctx.stroke()

  // Right wing
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(18 * scale, wingY - 6 * scale, 34 * scale, wingY + 2 * scale)
  ctx.stroke()

  ctx.restore()
}

export function FlyingBirds({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const MAX_BIRDS = 22

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const birds: Bird[] = Array.from({ length: MAX_BIRDS }, () =>
      makeBird(window.innerWidth, window.innerHeight)
    )
    // Spread them out initially
    birds.forEach((b, i) => { b.x = (window.innerWidth / MAX_BIRDS) * i - 80 })

    let raf = 0
    const startTime = Date.now()

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const W = window.innerWidth
      const H = window.innerHeight
      const t = (Date.now() - startTime) / 1000

      ctx.clearRect(0, 0, W, H)

      for (const bird of birds) {
        drawBird(ctx, bird, t)
        bird.x += bird.speed
        if (bird.x > W + 100) {
          Object.assign(bird, makeBird(W, H))
        }
      }

      raf = requestAnimationFrame(draw)
    }

    raf = requestAnimationFrame(draw)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [reduced])

  if (reduced) return null

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: 0, opacity: 0.6 }}
    />
  )
}
