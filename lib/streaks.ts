import type { DailyStats } from './db/queries'

export interface StreakData {
  logging: number
  hydration: number
  steps: number
  protein: number
  workouts: number
}

// UTC date string — consistent with how daily_stats.date is stored
function utcDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function calcStreak(
  byDate: Map<string, DailyStats>,
  check: (d: DailyStats) => boolean
): number {
  // Use UTC midnight so the date string matches what's stored in daily_stats.date
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  let streak = 0

  // If today has no qualifying entry yet, start from yesterday
  if (!byDate.has(utcDateStr(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  while (streak <= 365) {
    const dateStr = utcDateStr(cursor)
    const day = byDate.get(dateStr)
    if (!day || !check(day)) break
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

function calcWorkoutStreak(workoutDates: Set<string>): number {
  const cursor = new Date()
  cursor.setUTCHours(0, 0, 0, 0)
  let streak = 0

  if (!workoutDates.has(utcDateStr(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  while (streak <= 365) {
    const dateStr = utcDateStr(cursor)
    if (!workoutDates.has(dateStr)) break
    streak++
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export function calculateStreaks(
  history: DailyStats[],
  workoutDates?: Set<string>,
  targets = { hydration: 2000, steps: 10000, protein: 150 }
): StreakData {
  const byDate = new Map<string, DailyStats>()
  for (const d of history) byDate.set(d.date, d)

  return {
    logging: calcStreak(byDate, (d) => d.calories > 0 || (d.steps ?? 0) > 0 || (d.water_ml ?? 0) > 0),
    hydration: calcStreak(byDate, (d) => (d.water_ml ?? 0) >= targets.hydration),
    steps: calcStreak(byDate, (d) => (d.steps ?? 0) >= targets.steps),
    protein: calcStreak(byDate, (d) => (d.protein_g ?? 0) >= targets.protein),
    workouts: workoutDates ? calcWorkoutStreak(workoutDates) : 0,
  }
}
