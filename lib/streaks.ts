import type { DailyStats } from './db/queries'

export interface StreakData {
  logging: number
  hydration: number
  steps: number
  protein: number
}

function isoDate(d: Date): string {
  return d.toISOString().split('T')[0]
}

function calcStreak(
  byDate: Map<string, DailyStats>,
  check: (d: DailyStats) => boolean
): number {
  const cursor = new Date()
  cursor.setHours(0, 0, 0, 0)
  let streak = 0

  // If today has no entry yet, start from yesterday
  if (!byDate.has(isoDate(cursor))) {
    cursor.setDate(cursor.getDate() - 1)
  }

  while (streak <= 365) {
    const dateStr = isoDate(cursor)
    const day = byDate.get(dateStr)
    if (!day || !check(day)) break
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
}

export function calculateStreaks(
  history: DailyStats[],
  targets = { hydration: 2000, steps: 10000, protein: 150 }
): StreakData {
  const byDate = new Map<string, DailyStats>()
  for (const d of history) byDate.set(d.date, d)

  return {
    logging: calcStreak(byDate, (d) => d.calories > 0 || (d.steps ?? 0) > 0 || (d.water_ml ?? 0) > 0),
    hydration: calcStreak(byDate, (d) => (d.water_ml ?? 0) >= targets.hydration),
    steps: calcStreak(byDate, (d) => (d.steps ?? 0) >= targets.steps),
    protein: calcStreak(byDate, (d) => (d.protein_g ?? 0) >= targets.protein),
  }
}
