'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'

export function SleepWidget({ hours, target = 8 }: { hours: number | null; target?: number }) {
  const val = hours ?? 0

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Sleep</h2>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={val} max={target} size={140} unit="hrs" decimals={1} countUp />
        <span className="text-xs text-text-muted">{target}h target</span>
      </div>
    </div>
  )
}
