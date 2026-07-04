'use client'

import { useState, useMemo } from 'react'
import { ActivityCalendar } from 'react-activity-calendar'
import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'
import type { DailyStats, WorkoutSession } from '@/lib/db/queries'

type HeatmapMetric = 'logged' | 'workouts' | 'calories' | 'steps' | 'sleep' | 'mood'

const METRIC_LABELS: Record<HeatmapMetric, string> = {
  logged: 'Logging',
  workouts: 'Workouts',
  calories: 'Calories',
  steps: 'Steps',
  sleep: 'Sleep',
  mood: 'Mood',
}

const MOOD_SCORE: Record<string, number> = {
  great: 5, good: 4, okay: 3, low: 2, bad: 1,
}

interface HeatmapWidgetProps {
  history: DailyStats[]
  workouts: WorkoutSession[]
  calorieTarget?: number
  stepsTarget?: number
}

function buildActivity(
  history: DailyStats[],
  workouts: WorkoutSession[],
  metric: HeatmapMetric,
  calorieTarget: number,
  stepsTarget: number,
) {
  const workoutDates = new Set(workouts.map(w => w.date))

  // Fill from 52 weeks ago to today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - 364)

  const statsByDate = new Map(history.map(d => [d.date, d]))

  const days: { date: string; count: number; level: 0 | 1 | 2 | 3 | 4 }[] = []

  for (let d = new Date(start); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    const stats = statsByDate.get(dateStr)

    let count = 0
    let level: 0 | 1 | 2 | 3 | 4 = 0

    if (metric === 'logged') {
      count = stats && (stats.calories > 0 || stats.steps > 0 || (stats.water_ml ?? 0) > 0) ? 1 : 0
      level = count as 0 | 1
    } else if (metric === 'workouts') {
      count = workoutDates.has(dateStr) ? 1 : 0
      level = count as 0 | 1
    } else if (metric === 'calories') {
      const cal = stats?.calories ?? 0
      count = cal
      if (cal === 0) level = 0
      else if (cal < calorieTarget * 0.6) level = 1
      else if (cal < calorieTarget * 0.85) level = 2
      else if (cal <= calorieTarget * 1.1) level = 4
      else level = 3
    } else if (metric === 'steps') {
      const s = stats?.steps ?? 0
      count = s
      if (s === 0) level = 0
      else if (s < stepsTarget * 0.5) level = 1
      else if (s < stepsTarget * 0.75) level = 2
      else if (s < stepsTarget) level = 3
      else level = 4
    } else if (metric === 'sleep') {
      const hr = stats?.sleep_hours ?? 0
      count = Math.round(hr * 10)
      if (hr === 0) level = 0
      else if (hr < 5) level = 1
      else if (hr < 7) level = 2
      else if (hr < 8) level = 3
      else level = 4
    } else if (metric === 'mood') {
      const score = MOOD_SCORE[stats?.mood ?? ''] ?? 0
      count = score
      level = score as 0 | 1 | 2 | 3 | 4
    }

    days.push({ date: dateStr, count, level })
  }

  return days
}

export function HeatmapWidget({ history, workouts, calorieTarget = 2000, stepsTarget = 10000 }: HeatmapWidgetProps) {
  const { w, h } = useGridItemSize()
  const [metric, setMetric] = useState<HeatmapMetric>('logged')

  const compact = w <= 2 || h <= 3

  const data = useMemo(
    () => buildActivity(history, workouts, metric, calorieTarget, stepsTarget),
    [history, workouts, metric, calorieTarget, stepsTarget]
  )

  const accentColour = 'var(--accent)'

  return (
    <div
      className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3 h-full overflow-hidden"
      style={{ boxShadow: 'var(--shadow-md)' }}
    >
      <div className="flex items-center justify-between gap-2 shrink-0">
        <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest">
          Year · {METRIC_LABELS[metric]}
        </h2>
        {!compact && (
          <div className="flex gap-1 flex-wrap justify-end">
            {(Object.keys(METRIC_LABELS) as HeatmapMetric[]).map((m) => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className="text-[10px] px-2 py-0.5 rounded-full transition-colors"
                style={metric === m
                  ? { background: 'var(--accent)', color: '#fff' }
                  : { background: 'var(--surface-elevated)', color: 'var(--color-text-muted)' }
                }
              >
                {METRIC_LABELS[m]}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-hidden flex items-center">
        <ActivityCalendar
          data={data}
          blockSize={compact ? 8 : 12}
          blockMargin={compact ? 2 : 3}
          blockRadius={2}
          fontSize={10}
          showMonthLabels={!compact}
          labels={compact ? undefined : { totalCount: `{{count}} days active in the last year` }}
          theme={{
            dark: ['var(--surface-elevated)', '#4c1d95', '#6d28d9', '#7c3aed', '#8b5cf6'],
          }}
          colorScheme="dark"
          style={{ maxWidth: '100%' }}
        />
      </div>
    </div>
  )
}
