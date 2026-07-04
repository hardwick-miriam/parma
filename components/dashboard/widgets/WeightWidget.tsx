'use client'

import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'

interface WeightWidgetProps {
  weight_kg: number | null
  goalWeight?: number | null
}

export function WeightWidget({ weight_kg, goalWeight }: WeightWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 3
  const toGoal = weight_kg != null && goalWeight != null
    ? (weight_kg - goalWeight).toFixed(1)
    : null

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Weight</h2>
      {weight_kg != null ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <div className="flex items-baseline gap-1">
            <span className={`font-bold text-text tabular-nums ${compact ? 'text-3xl' : 'text-5xl'}`}>{weight_kg.toFixed(1)}</span>
            <span className="text-sm text-text-muted">kg</span>
          </div>
          {!compact && toGoal !== null && goalWeight && (
            <span className="text-xs text-text-subtle text-center leading-tight mt-1 px-2">
              {parseFloat(toGoal) > 0
                ? `${toGoal} kg above goal`
                : `${Math.abs(parseFloat(toGoal))} kg below goal`}
            </span>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <p className="text-text-subtle text-sm">Not logged</p>
          {!compact && goalWeight && (
            <p className="text-xs text-text-subtle">Goal: {goalWeight} kg</p>
          )}
        </div>
      )}
    </div>
  )
}
