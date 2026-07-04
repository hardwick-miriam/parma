'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'

export function SleepWidget({
  hours,
  source,
  target = 8,
}: {
  hours: number | null
  source?: string | null
  target?: number
}) {
  const val = hours ?? 0
  const whoopPowered = source === 'whoop'

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Sleep</h2>
        {whoopPowered && (
          <span
            className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide"
            style={{ background: 'var(--accent)', color: 'var(--bg)', opacity: 0.85 }}
          >
            WHOOP
          </span>
        )}
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={val} max={target} size={140} unit="hrs" decimals={1} countUp />
        <span className="text-xs text-text-muted">{target}h target</span>
      </div>
    </div>
  )
}
