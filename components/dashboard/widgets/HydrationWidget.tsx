'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'

export function HydrationWidget({ water_ml, target = 2000 }: { water_ml: number; target?: number }) {
  const litres = (water_ml / 1000).toFixed(1)

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Hydration</h2>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={water_ml} max={target} size={140} label={litres} unit="L" />
        <span className="text-xs text-text-muted">{(target / 1000).toFixed(1)}L target</span>
      </div>
    </div>
  )
}
