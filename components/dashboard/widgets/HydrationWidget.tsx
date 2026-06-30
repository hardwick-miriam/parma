'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'
import { StreakBadge } from '@/components/ui/StreakBadge'

export function HydrationWidget({ water_ml, target = 2000, streak = 0 }: { water_ml: number; target?: number; streak?: number }) {
  const litres = water_ml / 1000
  const targetLitres = target / 1000

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Hydration</h2>
        <StreakBadge count={streak} />
      </div>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress
          value={litres}
          max={targetLitres}
          size={140}
          unit="L"
          decimals={1}
          countUp
        />
        <span className="text-xs text-text-muted">{targetLitres.toFixed(1)}L target</span>
      </div>
    </div>
  )
}
