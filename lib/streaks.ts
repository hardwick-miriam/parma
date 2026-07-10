import { getLocalDate } from './date'
import type { DailyStats } from './db/queries'

export interface StreakData {
  logging: number
  hydration: number
  steps: number
  protein: number
  workouts: number
}

// One day earlier than a YYYY-MM-DD string, still in Europe/London terms.
function dayBefore(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  d.setUTCDate(d.getUTCDate() - 1)
  return getLocalDate(undefined, d)
}

function calcStreak(
  byDate: Map<string, DailyStats>,
  check: (d: DailyStats) => boolean
): number {
  // daily_stats.date is now always written via getLocalDate() (Europe/London),
  // so streak math must walk the same local calendar, not UTC — otherwise the
  // two disagree on what "today" is for up to an hour after local midnight.
  let cursor = getLocalDate()
  let streak = 0

  // If today has no qualifying entry yet, start from yesterday
  if (!byDate.has(cursor)) {
    cursor = dayBefore(cursor)
  }

  while (streak <= 365) {
    const day = byDate.get(cursor)
    if (!day || !check(day)) break
    streak++
    cursor = dayBefore(cursor)
  }

  return streak
}

function calcWorkoutStreak(workoutDates: Set<string>): number {
  let cursor = getLocalDate()
  let streak = 0

  if (!workoutDates.has(cursor)) {
    cursor = dayBefore(cursor)
  }

  while (streak <= 365) {
    if (!workoutDates.has(cursor)) break
    streak++
    cursor = dayBefore(cursor)
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
