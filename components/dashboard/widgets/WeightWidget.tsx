'use client'

export function WeightWidget({ weight_kg }: { weight_kg: number | null }) {
  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-3 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Weight</h2>
      {weight_kg != null ? (
        <div className="flex flex-col items-center gap-1 py-2">
          <span className="text-5xl font-bold text-text tabular-nums">{weight_kg.toFixed(1)}</span>
          <span className="text-sm text-text-muted">kg</span>
        </div>
      ) : (
        <p className="text-text-subtle text-sm text-center py-4">Not logged today</p>
      )}
    </div>
  )
}
