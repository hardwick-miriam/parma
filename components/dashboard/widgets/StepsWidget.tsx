'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { ComparisonBadge } from '@/components/ui/ComparisonBadge'
import { CountUp } from '@/components/ui/CountUp'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { PeriodComparison } from '@/lib/comparison'

interface StepsWidgetProps {
  steps: number
  target?: number
  streak?: number
  comp?: PeriodComparison | null
}

export function StepsWidget({ steps, target = 10000, streak = 0, comp }: StepsWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 4
  const pct = Math.round(Math.min((steps / target) * 100, 100))

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">Steps</h2>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-2xl font-bold text-text tabular-nums"><CountUp to={steps} duration={800} /></p>
          <p className="text-xs text-text-subtle">{pct}% of {target.toLocaleString()}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Steps</h2>
        <StreakBadge count={streak} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={steps} max={target} size={140} unit="steps" countUp />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">{pct}% of {target.toLocaleString()}</span>
          {comp && <ComparisonBadge change={comp.change} />}
        </div>
      </div>
    </div>
  )
}
