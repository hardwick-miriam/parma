'use client'

import { useEffect, useRef } from 'react'

const CHARS = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF'

interface Column {
  y: number
  speed: number
  chars: string[]
  charIdx: number
}

function makeColumn(h: number): Column {
  const len = 6 + Math.floor(Math.random() * 16)
  return {
    y: -Math.random() * h,
    speed: 1 + Math.random() * 2.5,
    chars: Array.from({ length: len }, () => CHARS[Math.floor(Math.random() * CHARS.length)]),
    charIdx: 0,
  }
}

export function DigitalRain({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (reduced) return
    const canvas = canvasRef.current
    if (!canvas) return

    const dpr = window.devicePixelRatio || 1
    const fontSize = 14
    const colW = fontSize

    function resize() {
      if (!canvas) return
      canvas.width = window.innerWidth * dpr
      canvas.height = window.innerHeight * dpr
      const ctx = canvas.getContext('2d')
      if (ctx) ctx.scale(dpr, dpr)
    }
    resize()
    window.addEventListener('resize', resize)

    const numCols = Math.ceil(window.innerWidth / colW)
    const cols: Column[] = Array.from({ length: numCols }, () =>
      makeColumn(window.innerHeight)
    )

    let raf = 0
    let frame = 0

    function draw() {
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      const W = window.innerWidth
      const H = window.innerHeight

      // Fade trail
      ctx.fillStyle = 'rgba(0,0,0,0.06)'
      ctx.fillRect(0, 0, W, H)

      frame++

      for (let i = 0; i < cols.length; i++) {
        const col = cols[i]
        const x = i * colW

        col.y += col.speed

        // Randomise one char occasionally
        if (frame % 4 === 0) {
          const ri = Math.floor(Math.random() * col.chars.length)
          col.chars[ri] = CHARS[Math.floor(Math.random() * CHARS.length)]
        }

        // Draw the column — head is bright white-green, trail fades
        const len = col.chars.length
        for (let j = 0; j < len; j++) {
          const yPos = col.y - j * fontSize
          if (yPos < -fontSize || yPos > H + fontSize) continue

          const ratio = 1 - j / len
          if (j === 0) {
            ctx.fillStyle = `rgba(180,255,180,${0.95})`
          } else {
            ctx.fillStyle = `rgba(0,${Math.round(180 * ratio + 40)},0,${ratio * 0.8})`
          }

          ctx.font = `${fontSize}px 'JetBrains Mono', 'Courier New', monospace`
          ctx.fillText(col.chars[j], x, yPos)
        }

        // Reset when off screen
        if (col.y - len * fontSize > H) {
          cols[i] = makeColumn(H)
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
      style={{ zIndex: 0, opacity: 0.55 }}
    />
  )
}
