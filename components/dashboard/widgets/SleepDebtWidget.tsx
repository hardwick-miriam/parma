'use client'

import type { DailyStats } from '@/lib/db/queries'

const TARGET = 8 // hours

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
  if (deficit <= 0) return '#34d399' // met target
  if (deficit < 1) return '#fbbf24' // slight
  return '#f87171' // significant
}

interface SleepDebtWidgetProps {
  history: DailyStats[]
  target?: number
}

export function SleepDebtWidget({ history, target = TARGET }: SleepDebtWidgetProps) {
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

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Sleep Debt</h2>
        <span className="text-xs text-text-subtle">14-day</span>
      </div>

      {/* KPI row */}
      <div className="flex gap-4">
        <div>
          <p className="text-2xl font-bold tabular-nums" style={{ color: totalDebt > 10 ? '#f87171' : totalDebt > 4 ? '#fbbf24' : '#34d399' }}>
            {totalDebt.toFixed(1)}h
          </p>
          <p className="text-[11px] text-text-subtle mt-0.5">total debt</p>
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums text-text">
            {daysLogged > 0 ? Math.round((daysMetTarget / daysLogged) * 100) : 0}%
          </p>
          <p className="text-[11px] text-text-subtle mt-0.5">nights on target</p>
        </div>
      </div>

      {/* Bar chart */}
      <div className="flex-1 flex flex-col justify-end gap-1 min-h-0">
        <div className="flex items-end gap-0.5 h-full min-h-[48px]" style={{ height: 72 }}>
          {bars.map((b, i) => (
            <div
              key={b.date}
              className="flex-1 rounded-sm"
              title={b.hasData ? `${b.date}: ${b.hours.toFixed(1)}h` : `${b.date}: no data`}
              style={{
                height: b.hasData ? `${Math.round((b.hours / maxBar) * 100)}%` : '20%',
                minHeight: 4,
                background: barColor(b.deficit, b.hasData),
                opacity: i === 13 ? 1 : 0.75 + i * 0.015,
              }}
            />
          ))}
        </div>
        {/* Target line label */}
        <div className="flex items-center gap-1">
          <div className="h-px flex-1 border-t border-dashed border-border" />
          <span className="text-[10px] text-text-subtle">{target}h target</span>
        </div>
        <p className="text-[10px] text-text-subtle text-center">
          {days14[0].slice(5).replace('-', '/')} – {days14[13].slice(5).replace('-', '/')}
        </p>
      </div>
    </div>
  )
}
