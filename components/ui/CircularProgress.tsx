'use client'

interface CircularProgressProps {
  value: number
  max: number
  size?: number
  strokeWidth?: number
  label?: string
  unit?: string
}

export function CircularProgress({
  value,
  max,
  size = 120,
  strokeWidth = 8,
  label,
  unit,
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(value / max, 1)
  const offset = circumference * (1 - pct)
  const cx = size / 2
  const cy = size / 2

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#a3e635"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute flex flex-col items-center leading-none">
        <span className="text-2xl font-bold text-text tabular-nums">
          {value.toLocaleString()}
        </span>
        {unit && <span className="text-xs text-text-muted mt-0.5">{unit}</span>}
        {label && <span className="text-xs text-text-subtle mt-1">{label}</span>}
      </div>
    </div>
  )
}
