'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  to: number
  duration?: number
  decimals?: number
  className?: string
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

export function CountUp({ to, duration = 900, decimals = 0, className }: CountUpProps) {
  const [value, setValue] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)

  useEffect(() => {
    if (to === 0) {
      setValue(0)
      return
    }

    startRef.current = null

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      setValue(to * easeOut(progress))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setValue(to)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [to, duration])

  return (
    <span className={className}>
      {value.toFixed(decimals)}
    </span>
  )
}
