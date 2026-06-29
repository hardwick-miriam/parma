'use client'

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  unit?: string
  /** Override the ring colour. Defaults to the accent CSS variable. */
  color?: string
  /** Show a positive (green) ring when target is hit */
  showTargetGlow?: boolean
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
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)
  const cx = size / 2
  const cy = size / 2

  const atTarget = value >= max
  const ringColor = atTarget && showTargetGlow
    ? 'var(--positive)'
    : (color ?? 'var(--accent)')

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
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1), stroke 0.4s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none gap-0.5">
        <span className="text-2xl font-bold text-text tabular-nums">
          {value.toLocaleString()}
        </span>
        {unit && <span className="text-[11px] text-text-muted">{unit}</span>}
        {label && <span className="text-[10px] text-text-subtle">{label}</span>}
      </div>
    </div>
  )
}
