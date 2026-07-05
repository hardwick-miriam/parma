'use client'

import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { DailyStats } from '@/lib/db/queries'

const TARGET = 8

function toKey(d: Date) {
  return d.toISOString().split('T')[0]
}

function getLast14Days(): string[] {
  const days: string[] = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    days.push(toKey(d))
  }
  return days
}

function barColor(deficit: number, hasData: boolean): string {
  if (!hasData) return 'var(--border)'
  if (deficit <= 0) return '#34d399'
  if (deficit < 1) return '#fbbf24'
  return '#f87171'
}

interface SleepDebtWidgetProps {
  history: DailyStats[]
  target?: number
}

export function SleepDebtWidget({ history, target = TARGET }: SleepDebtWidgetProps) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 3

  const days14 = getLast14Days()
  const byDate = new Map(history.map((d) => [d.date, d]))

  const bars = days14.map((date) => {
    const row = byDate.get(date)
    const hasData = row?.sleep_hours != null
    const hours = row?.sleep_hours ?? 0
    const deficit = Math.max(0, target - hours)
    return { date, hours, deficit, hasData }
  })

  const totalDebt = bars.reduce((s, b) => s + (b.hasData ? b.deficit : 0), 0)
  const daysLogged = bars.filter((b) => b.hasData).length
  const daysMetTarget = bars.filter((b) => b.hasData && b.deficit <= 0).length
  const maxBar = Math.max(...bars.map((b) => b.hasData ? b.hours : 0), target)

  const debtColor = totalDebt > 10 ? '#f87171' : totalDebt > 4 ? '#fbbf24' : '#34d399'
  const pctOnTarget = daysLogged > 0 ? Math.round((daysMetTarget / daysLogged) * 100) : 0

  if (compact) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Sleep Debt</h2>
        <div className="flex-1 flex flex-col justify-center gap-1">
          <p className="text-2xl font-bold tabular-nums" style={{ color: debtColor }}>{totalDebt.toFixed(1)}h</p>
          <p className="text-xs text-text-subtle truncate">{pctOnTarget}% nights on target</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Sleep Debt</h2>
        <span className="text-xs text-text-subtle shrink-0 ml-2">14-day</span>
      </div>

      <div className="flex gap-4 shrink-0">
        <div>
          <p className="text-2xl font-bold tabular-nums leading-none" style={{ color: debtColor }}>
            {totalDebt.toFixed(1)}h
          </p>
          <p className="text-[10px] text-text-subtle mt-0.5 truncate">total debt</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums leading-none text-text">{pctOnTarget}%</p>
          <p className="text-[10px] text-text-subtle mt-0.5 truncate">nights on target</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-end gap-1 min-h-0">
        <div className="flex items-end gap-0.5 flex-1 min-h-[32px]">
          {bars.map((b, i) => (
            <div
              key={b.date}
              className="flex-1 rounded-sm"
              title={b.hasData ? `${b.date}: ${b.hours.toFixed(1)}h` : `${b.date}: no data`}
              style={{
                height: b.hasData ? `${Math.round((b.hours / maxBar) * 100)}%` : '20%',
                minHeight: 3,
                background: barColor(b.deficit, b.hasData),
                opacity: i === 13 ? 1 : 0.6 + i * 0.02,
              }}
            />
          ))}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <div className="h-px flex-1 border-t border-dashed border-border" />
          <span className="text-[9px] text-text-subtle">{target}h target</span>
        </div>
        <p className="text-[9px] text-text-subtle text-center shrink-0">
          {days14[0].slice(5).replace('-', '/')} – {days14[13].slice(5).replace('-', '/')}
        </p>
      </div>
    </div>
  )
}
