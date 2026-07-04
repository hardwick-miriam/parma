'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'

export function SleepWidget({
  hours,
  source,
  target = 8,
}: {
  hours: number | null
  source?: string | null
  target?: number
}) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 3
  const val = hours ?? 0
  const whoopPowered = source === 'whoop'
  const pct = Math.round(Math.min((val / target) * 100, 100))

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Sleep</h2>
        <div className="flex-1 flex flex-col justify-center">
          <p className="text-2xl font-bold text-text tabular-nums">{val > 0 ? val.toFixed(1) : '—'}</p>
          <p className="text-xs text-text-subtle">{val > 0 ? `hrs · ${pct}%` : 'not logged'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Sleep</h2>
        {whoopPowered && (
          <span className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide" style={{ background: 'var(--accent)', color: 'var(--bg)', opacity: 0.85 }}>
            WHOOP
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={val} max={target} size={w >= 4 ? 140 : 110} unit="hrs" decimals={1} countUp />
        <span className="text-xs text-text-muted">{target}h target</span>
      </div>
    </div>
  )
}
