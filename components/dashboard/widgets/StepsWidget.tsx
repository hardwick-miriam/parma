'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'
import { StreakBadge } from '@/components/ui/StreakBadge'

interface StepsWidgetProps {
  steps: number
  target?: number
  streak?: number
}

export function StepsWidget({ steps, target = 10000, streak = 0 }: StepsWidgetProps) {
  const pct = Math.round(Math.min((steps / target) * 100, 100))

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Steps</h2>
        <StreakBadge count={streak} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={steps} max={target} size={140} unit="steps" countUp />
        <span className="text-xs text-text-muted">{pct}% of {target.toLocaleString()}</span>
      </div>
    </div>
  )
}
