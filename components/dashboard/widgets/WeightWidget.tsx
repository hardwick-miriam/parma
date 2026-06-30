'use client'

interface WeightWidgetProps {
  weight_kg: number | null
  goalWeight?: number | null
}

export function WeightWidget({ weight_kg, goalWeight }: WeightWidgetProps) {
  const toGoal = weight_kg != null && goalWeight != null
    ? (weight_kg - goalWeight).toFixed(1)
    : null

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-3 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Weight</h2>
      {weight_kg != null ? (
        <div className="flex flex-col items-center gap-1 py-2">
          <span className="text-5xl font-bold text-text tabular-nums">{weight_kg.toFixed(1)}</span>
          <span className="text-sm text-text-muted">kg</span>
          {toGoal !== null && goalWeight && (
            <span className="text-xs text-text-subtle mt-1">
              {parseFloat(toGoal) > 0 ? `${toGoal} kg above` : `${Math.abs(parseFloat(toGoal))} kg below`} goal ({goalWeight} kg)
            </span>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 py-4">
          <p className="text-text-subtle text-sm">Not logged today</p>
          {goalWeight && (
            <p className="text-xs text-text-subtle">Goal: {goalWeight} kg</p>
          )}
        </div>
      )}
    </div>
  )
}
