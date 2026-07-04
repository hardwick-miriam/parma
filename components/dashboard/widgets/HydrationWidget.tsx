'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'
import { StreakBadge } from '@/components/ui/StreakBadge'
import { ComparisonBadge } from '@/components/ui/ComparisonBadge'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { PeriodComparison } from '@/lib/comparison'

interface HydrationWidgetProps {
  water_ml: number
  target?: number
  streak?: number
  comp?: PeriodComparison | null
}

export function HydrationWidget({ water_ml, target = 2000, streak = 0, comp }: HydrationWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 3
  const litres = water_ml / 1000
  const targetLitres = target / 1000
  const pct = Math.round(Math.min((litres / targetLitres) * 100, 100))

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Hydration</h2>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-2xl font-bold text-text tabular-nums">{litres.toFixed(1)}<span className="text-sm font-normal ml-1">L</span></p>
          <p className="text-xs text-text-subtle">{pct}% of {targetLitres.toFixed(1)}L</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Hydration</h2>
        <StreakBadge count={streak} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={litres} max={targetLitres} size={w >= 4 ? 140 : 110} unit="L" decimals={1} countUp />
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-text-muted">{targetLitres.toFixed(1)}L target</span>
          {comp && <ComparisonBadge change={comp.change} />}
        </div>
      </div>
    </div>
  )
}
