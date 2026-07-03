'use client'

import { computeRecovery } from '@/lib/recovery'
import type { DailyStats, HealthStatus } from '@/lib/db/queries'
import type { WhoopMetrics } from '@/lib/db/whoop'

const LEVEL_COLOR: Record<string, string> = {
  poor: 'var(--negative)',
  fair: 'var(--warning)',
  good: 'var(--positive)',
  great: 'var(--accent)',
}

const LEVEL_LABEL: Record<string, string> = {
  poor: 'Poor',
  fair: 'Fair',
  good: 'Good',
  great: 'Great',
}

interface RecoveryWidgetProps {
  stats: DailyStats | null
  health: HealthStatus | null
  whoop?: WhoopMetrics | null
}

export function RecoveryWidget({ stats, health, whoop }: RecoveryWidgetProps) {
  const { score, level, explanation, whoopPowered } = computeRecovery(stats, health, whoop)
  const color = LEVEL_COLOR[level]
  const r = 26
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - score / 100)

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-4 flex items-center gap-4"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* Gauge */}
      <div className="relative shrink-0" style={{ width: 68, height: 68 }}>
        <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
          <circle
            cx="30" cy="30" r={r}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="5"
          />
          <circle
            cx="30" cy="30" r={r}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={circ}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.9s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold tabular-nums" style={{ color }}>
            {score}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
          <span className="text-base font-semibold" style={{ color }}>
            {LEVEL_LABEL[level]}
          </span>
          <span className="text-xs text-text-subtle">readiness today</span>
          {whoopPowered && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded font-medium tracking-wide"
              style={{ background: 'var(--accent)', color: 'var(--bg)', opacity: 0.85 }}
            >
              WHOOP
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted leading-relaxed">{explanation}</p>
      </div>
    </div>
  )
}
