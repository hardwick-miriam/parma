'use client'

import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { WhoopMetrics } from '@/lib/db/whoop'

interface WhoopWidgetProps {
  // Most recent row with recovery_score != null (may be from a previous day)
  today: WhoopMetrics | null
  history: WhoopMetrics[]
}

function recoveryColor(score: number | null): string {
  if (score == null) return 'var(--text-muted)'
  if (score >= 67) return 'var(--positive)'
  if (score >= 34) return 'var(--warning)'
  return 'var(--negative)'
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const W = 80, H = 28
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ overflow: 'visible' }}>
      <polyline
        points={pts}
        fill="none"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity={0.7}
      />
    </svg>
  )
}

function shortDate(isoDate: string): string {
  // isoDate is YYYY-MM-DD; parse as local noon to avoid timezone flipping the day
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short',
  })
}

export function WhoopWidget({ today, history }: WhoopWidgetProps) {
  const { w } = useGridItemSize()
  const compact = w <= 2

  // `today` is already the latest scored row (server picks it via getLatestWhoopMetrics).
  // Fall back into history just in case it's null.
  const display = today ?? history.find(m => m.recovery_score != null) ?? null

  // Check if displayed row is actually from today (UTC, good enough for label)
  const utcToday = new Date().toISOString().split('T')[0]
  const isActuallyToday = display?.date === utcToday
  const dateLabel = display && !isActuallyToday ? shortDate(display.date) : null

  const recovery = display?.recovery_score ?? null
  const strain = display?.strain ?? null
  const hrv = display?.hrv_rmssd_milli != null ? Math.round(display.hrv_rmssd_milli) : null
  const rhr = display?.resting_hr ?? null
  const sleep = display?.sleep_performance_pct != null
    ? Math.round(display.sleep_performance_pct)
    : null

  // Sparkline: 7 most recent scored days, oldest→newest
  const sparkData = history
    .filter(m => (m.recovery_score ?? 0) > 0)
    .slice(0, 7)
    .reverse()
    .map(m => m.recovery_score as number)

  const color = recoveryColor(recovery)

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-3 flex flex-col items-center justify-center h-full gap-1 overflow-hidden">
        <span className="text-2xl font-bold tabular-nums" style={{ color }}>
          {recovery != null ? Math.round(recovery) : '—'}
        </span>
        <span className="text-[10px] text-text-muted uppercase tracking-wider">recovery</span>
        {dateLabel && <span className="text-[9px] text-text-subtle">{dateLabel}</span>}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-text-subtle">Recovery</span>
          {dateLabel && (
            <span className="text-[10px] text-text-subtle">· {dateLabel}</span>
          )}
        </div>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded font-medium"
          style={{ background: 'var(--accent)', color: 'var(--bg)', opacity: 0.85 }}
        >
          WHOOP
        </span>
      </div>

      {/* Score */}
      <div className="flex items-end gap-2">
        <span className="text-4xl font-bold tabular-nums leading-none" style={{ color }}>
          {recovery != null ? Math.round(recovery) : '—'}
        </span>
        {recovery != null && <span className="text-sm text-text-muted pb-0.5">%</span>}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-base font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
            {strain != null ? strain.toFixed(1) : '—'}
          </div>
          <div className="text-[10px] text-text-muted">Strain</div>
        </div>
        <div>
          <div className="text-base font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
            {hrv != null ? hrv : '—'}
          </div>
          <div className="text-[10px] text-text-muted">HRV ms</div>
        </div>
        <div>
          <div className="text-base font-semibold tabular-nums" style={{ color: 'var(--text)' }}>
            {rhr != null ? rhr : '—'}
          </div>
          <div className="text-[10px] text-text-muted">RHR bpm</div>
        </div>
      </div>

      {/* Sleep performance */}
      {sleep != null && (
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div
              className="h-full rounded-full"
              style={{ width: `${sleep}%`, background: 'var(--accent)', opacity: 0.75 }}
            />
          </div>
          <span className="text-xs text-text-muted tabular-nums">{sleep}% sleep</span>
        </div>
      )}

      {/* Sparkline */}
      {sparkData.length >= 2 && (
        <div className="mt-auto flex items-end justify-between">
          <span className="text-[10px] text-text-muted">7d recovery</span>
          <Sparkline data={sparkData} />
        </div>
      )}
    </div>
  )
}
