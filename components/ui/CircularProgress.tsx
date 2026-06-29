'use client'

import { useEffect, useRef, useState } from 'react'

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  unit?: string
  color?: string
  showTargetGlow?: boolean
  /** Animate the number counting up from 0 on mount */
  countUp?: boolean
}

function easeOut(t: number) {
  return 1 - Math.pow(1 - t, 3)
}

function useCountUp(target: number, enabled: boolean, duration = 900) {
  const [value, setValue] = useState(enabled ? 0 : target)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const prevTarget = useRef(target)

  useEffect(() => {
    if (!enabled) { setValue(target); return }
    if (target === prevTarget.current && startRef.current !== null) return
    prevTarget.current = target
    startRef.current = null
    const from = value

    function tick(now: number) {
      if (startRef.current === null) startRef.current = now
      const elapsed = now - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      setValue(from + (target - from) * easeOut(progress))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      } else {
        setValue(target)
      }
    }

    rafRef.current = requestAnimationFrame(tick)
    return () => { if (rafRef.current !== null) cancelAnimationFrame(rafRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, enabled, duration])

  return value
}

export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 7,
  label,
  unit,
  color,
  showTargetGlow,
  countUp = false,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const animatedValue = useCountUp(value, countUp)
  const pct = Math.min(animatedValue / max, 1)
  const offset = circumference * (1 - pct)
  const cx = size / 2
  const cy = size / 2

  const atTarget = value >= max
  const ringColor = atTarget && showTargetGlow
    ? 'var(--positive)'
    : (color ?? 'var(--accent)')

  const isAccent = !color && !(atTarget && showTargetGlow)

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={isAccent ? 'accent-breathe' : undefined}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none gap-0.5">
        <span className="text-2xl font-bold text-text tabular-nums">
          {countUp ? Math.round(animatedValue).toLocaleString() : value.toLocaleString()}
        </span>
        {unit && <span className="text-[11px] text-text-muted">{unit}</span>}
        {label && <span className="text-[10px] text-text-subtle">{label}</span>}
      </div>
    </div>
  )
}
