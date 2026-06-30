'use client'

interface StreakBadgeProps {
  count: number
  label?: string
}

export function StreakBadge({ count, label = 'day streak' }: StreakBadgeProps) {
  if (count < 2) return null
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{
        background: 'rgba(139,92,246,0.15)',
        border: '1px solid rgba(139,92,246,0.25)',
        color: 'var(--accent)',
      }}
    >
      <span>🔥</span>
      {count} {label}
    </span>
  )
}
