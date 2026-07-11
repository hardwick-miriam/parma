import { getRecentWorkouts } from '@/lib/db/queries'
import { getUserPreferences } from '@/lib/db/preferences'
import { getLocalDate } from '@/lib/date'
import type { SupabaseClient } from '@supabase/supabase-js'

function daysSinceRest(recentWorkouts: { date: string }[]): number {
  const trainedDates = new Set(recentWorkouts.map((w) => w.date))
  const today = new Date()
  for (let i = 0; i < 60; i++) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const dateStr = getLocalDate(undefined, d)
    if (!trainedDates.has(dateStr)) return i
  }
  return 60
}

/** Everything the Gym page needs. Called from both the server page (first paint) and /api/gym-summary (client refetch on realtime invalidation). */
export async function getGymPageData(userId: string, supabase: SupabaseClient) {
  const [recentWorkouts, prefs] = await Promise.all([
    getRecentWorkouts(userId, 90, supabase).catch(() => []),
    getUserPreferences(userId, supabase).catch(() => null),
  ])

  return {
    recentWorkouts,
    restDays: daysSinceRest(recentWorkouts),
    hiddenWidgets: prefs?.hidden_widgets ?? [],
  }
}

export type GymPageData = Awaited<ReturnType<typeof getGymPageData>>
