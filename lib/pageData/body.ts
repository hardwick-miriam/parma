import { getRecentWorkouts, getInjuriesWithCheckins } from '@/lib/db/queries'
import { getWhoopMetrics } from '@/lib/db/whoop'
import { computeMuscleRecovery } from '@/lib/muscleRecovery'
import type { WorkoutSession } from '@/lib/db/queries'
import type { SupabaseClient } from '@supabase/supabase-js'

/** Everything the Body page needs. Called from both the server page (first paint) and /api/body-summary (client refetch on realtime invalidation). */
export async function getBodyPageData(userId: string, supabase: SupabaseClient) {
  const [recentWorkouts, injuries, whoopHistory] = await Promise.all([
    getRecentWorkouts(userId, 90, supabase).catch(() => []),
    getInjuriesWithCheckins(userId).catch(() => []),
    getWhoopMetrics(userId, 10, supabase).catch(() => []),
  ])

  const sessions = recentWorkouts.map((w: WorkoutSession & { whoop_strain?: number }) => ({
    date: w.date,
    exercises: w.exercises ?? [],
    whoopStrain: w.whoop_strain,
  }))
  const whoopHist = whoopHistory.map((wh) => ({ date: wh.date, score: wh.recovery_score ?? 0 }))
  const recoveryMap = computeMuscleRecovery(sessions, [], whoopHist, {})

  return { recentWorkouts, activeInjuries: injuries, recoveryMap }
}

export type BodyPageData = Awaited<ReturnType<typeof getBodyPageData>>
