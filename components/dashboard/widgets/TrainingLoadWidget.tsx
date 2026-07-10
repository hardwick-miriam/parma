'use client'

import { getLocalDate } from '@/lib/date'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { WorkoutSession } from '@/lib/db/queries'

const FEELING_INTENSITY: Record<string, number> = {
  great: 1.2, good: 1.0, okay: 0.8, tired: 0.6, rough: 0.5,
}

function getDayLoad(workouts: WorkoutSession[]): number {
  return workouts.reduce((sum, w) => {
    const duration = w.duration_minutes ?? 45
    const intensity = FEELING_INTENSITY[w.feeling ?? 'good'] ?? 1.0
    return sum + duration * intensity
  }, 0)
}

interface TrainingLoadWidgetProps {
  recentWorkouts: WorkoutSession[]
}

export function TrainingLoadWidget({ recentWorkouts }: TrainingLoadWidgetProps) {
  const { w, h } = useGridItemSize()
  // At small sizes, 14 daily bars become a few pixels wide each —
  // unreadable rather than "cut". Show the last 7 days instead of
  // shrinking every bar further.
  const compact = w <= 3 || h <= 3
  const dayCount = compact ? 7 : 14

  // Build last N days
  const today = new Date()
  const days: Array<{ label: string; date: string; load: number }> = []

  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = getLocalDate(undefined, d)
    const dayWorkouts = recentWorkouts.filter((w) => w.date === dateStr)
    days.push({
      label: d.toLocaleDateString('en-GB', { weekday: 'short' }).slice(0, 1),
      date: dateStr,
      load: getDayLoad(dayWorkouts),
    })
  }

  const maxLoad = Math.max(...days.map((d) => d.load), 60)  // min 60 so bars are visible
  const totalLoad = days.reduce((sum, d) => sum + d.load, 0)
  const avgLoad = totalLoad / days.filter((d) => d.load > 0).length || 0

  // Acute (last 7d) vs chronic (7–14d) workload — needs the full 14-day
  // window, so only meaningful when not compact (dayCount === 14).
  const acute = dayCount === 14 ? days.slice(7).reduce((s, d) => s + d.load, 0) : 0
  const chronic = dayCount === 14 ? days.slice(0, 7).reduce((s, d) => s + d.load, 0) : 0
  const acwr = dayCount === 14 && chronic > 0 ? (acute / chronic).toFixed(2) : '—'

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <div className="flex items-center justify-between shrink-0">
        <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Training Load</h2>
        <span className="text-xs text-text-subtle">{dayCount} days</span>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 shrink-0">
        {[
          { label: 'Total min', value: Math.round(totalLoad) },
          { label: 'Daily avg', value: avgLoad > 0 ? Math.round(avgLoad) : '—' },
          { label: 'AC ratio', value: acwr },
        ].map((s) => (
          <div key={s.label} className="rounded-lg p-2 text-center border border-border" style={{ background: 'var(--surface-elevated)' }}>
            <div className="text-sm font-semibold text-text">{s.value}</div>
            <div className="text-xs text-text-subtle">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Bar chart */}
      <div className="flex items-end gap-0.5 h-16 flex-1 min-h-0">
        {days.map((d) => {
          const heightPct = maxLoad > 0 ? (d.load / maxLoad) * 100 : 0
          const isToday = d.date === getLocalDate()
          return (
            <div key={d.date} className="flex flex-col items-center gap-0.5 flex-1">
              <div className="w-full flex items-end" style={{ height: '52px' }}>
                <div
                  className="w-full rounded-sm transition-all"
                  style={{
                    height: `${Math.max(heightPct, d.load > 0 ? 8 : 0)}%`,
                    background: isToday ? 'var(--accent)' : d.load > 0 ? 'var(--accent-glow, rgba(99,102,241,0.5))' : 'var(--border)',
                    minHeight: d.load > 0 ? '4px' : '2px',
                  }}
                />
              </div>
              <span className="text-text-subtle" style={{ fontSize: '8px' }}>{d.label}</span>
            </div>
          )
        })}
      </div>

      {totalLoad === 0 && (
        <p className="text-text-subtle text-xs text-center -mt-2">No workouts with duration in last {dayCount} days</p>
      )}
    </div>
  )
}
