'use client'

import { CircularProgress } from '@/components/ui/CircularProgress'

interface StepsWidgetProps {
  steps: number
  target?: number
}

export function StepsWidget({ steps, target = 10000 }: StepsWidgetProps) {
  const pct = Math.round(Math.min((steps / target) * 100, 100))

  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
        Steps
      </h2>
      <div className="flex flex-col items-center gap-2">
        <CircularProgress value={steps} max={target} size={140} unit="steps" />
        <span className="text-xs text-text-muted">{pct}% of {target.toLocaleString()}</span>
      </div>
    </div>
  )
}
