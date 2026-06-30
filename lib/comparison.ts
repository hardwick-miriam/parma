import type { DailyStats } from './db/queries'

export interface PeriodComparison {
  change: number // % change vs prior period
  direction: 'up' | 'down' | 'flat'
}

function avgOver(
  history: DailyStats[],
  getValue: (d: DailyStats) => number,
  startDaysAgo: number,
  endDaysAgo: number
): number | null {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const vals = history
    .map((d) => {
      const date = new Date(d.date + 'T00:00:00')
      const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000)
      return { diffDays, value: getValue(d) }
    })
    .filter((d) => d.diffDays >= startDaysAgo && d.diffDays < endDaysAgo && d.value > 0)
    .map((d) => d.value)

  if (vals.length < 2) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

export function weekOverWeek(
  history: DailyStats[],
  getValue: (d: DailyStats) => number
): PeriodComparison | null {
  const thisWeek = avgOver(history, getValue, 0, 7)
  const lastWeek = avgOver(history, getValue, 7, 14)
  if (thisWeek === null || lastWeek === null || lastWeek === 0) return null
  const change = Math.round(((thisWeek - lastWeek) / lastWeek) * 100)
  return {
    change,
    direction: Math.abs(change) < 3 ? 'flat' : change > 0 ? 'up' : 'down',
  }
}
