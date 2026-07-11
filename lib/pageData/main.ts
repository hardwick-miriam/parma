import { getTodayStats, getHealthStatus, getRecentWorkouts, getActiveInjuries } from '@/lib/db/queries'
import { getWhoopConnection, getLatestWhoopMetrics, getWhoopMetrics } from '@/lib/db/whoop'
import { getUserPreferences } from '@/lib/db/preferences'
import { getLocalDate, getWeekdayName } from '@/lib/date'
import { getDailyStatsHistory } from '@/lib/db/history'
import { computeMuscleRecovery } from '@/lib/muscleRecovery'
import { trainTodayLine } from '@/lib/trainToday'
import { calculateStreaks } from '@/lib/streaks'
import type { WorkoutSession } from '@/lib/db/queries'
import type { SupabaseClient } from '@supabase/supabase-js'

async function getActiveRoutineRow(supabase: SupabaseClient, userId: string) {
  try {
    const { data } = await supabase.from('routines').select('*').eq('user_id', userId).eq('is_active', true).maybeSingle()
    return data
  } catch {
    return null
  }
}

/**
 * Everything Main needs EXCEPT the AI briefing (cron-cached once/day — not
 * part of the live-refetch surface). Called from both the server page (first
 * paint) and /api/main-summary (client refetch on realtime invalidation) so
 * there is exactly one implementation of this computation, not two.
 */
export async function getMainPageData(userId: string, supabase: SupabaseClient) {
  const whoopConn = await getWhoopConnection(userId).catch(() => null)

  const [stats, health, recentWorkouts, prefs, whoopToday, activeInjuries, whoopHistory, activeRoutine, history] = await Promise.all([
    getTodayStats(userId).catch(() => null),
    getHealthStatus(userId).catch(() => null),
    getRecentWorkouts(userId, 90).catch(() => []),
    getUserPreferences(userId).catch(() => null),
    whoopConn ? getLatestWhoopMetrics(userId).catch(() => null) : null,
    getActiveInjuries(userId).catch(() => []),
    whoopConn ? getWhoopMetrics(userId, 14).catch(() => []) : Promise.resolve([]),
    getActiveRoutineRow(supabase, userId),
    getDailyStatsHistory(userId, 90).catch(() => []),
  ])

  // Pre-aggregated server-side (never ships the raw recovery map to the client) —
  // just the one resulting line.
  const sessions = recentWorkouts.map((w: WorkoutSession & { whoop_strain?: number }) => ({
    date: w.date, exercises: w.exercises ?? [], whoopStrain: w.whoop_strain,
  }))
  const whoopHist = whoopHistory.map((wh) => ({ date: wh.date, score: wh.recovery_score ?? 0 }))
  const recoveryMap = computeMuscleRecovery(sessions, [], whoopHist, {})
  const weekday = getWeekdayName(getLocalDate())
  const plannedSession = activeRoutine?.sessions?.find((s: { day: string; label?: string }) => s.day === weekday || s.day === 'Any')
  const trainToday = trainTodayLine(recoveryMap, plannedSession?.label ?? (plannedSession ? plannedSession.day : null))

  const streaks = calculateStreaks(history, new Set(recentWorkouts.map((w) => w.date)))

  // Pre-aggregated trend slices — only what each graph needs, not raw dumps.
  const weightTrend = history
    .filter((d) => d.weight_kg != null)
    .map((d) => ({ date: d.date, value: d.weight_kg as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-90)

  const last7 = [...history].sort((a, b) => a.date.localeCompare(b.date)).slice(-7)
  const sleepTrend = last7.map((d) => ({ date: d.date, hours: d.sleep_hours ?? 0 }))
  const caloriesTrend = last7.map((d) => ({ date: d.date, calories: d.calories ?? 0 }))
  const stepsTrend = last7.map((d) => ({ date: d.date, steps: d.steps ?? 0 }))

  const recoveryStrainTrend = [...whoopHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((w) => ({ date: w.date, recovery: w.recovery_score ?? 0, strain: w.strain ?? 0 }))

  const hrvTrend = [...whoopHistory]
    .filter((w) => w.hrv_rmssd_milli != null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14)
    .map((w) => ({ date: w.date, hrv: Math.round(w.hrv_rmssd_milli as number) }))

  return {
    stats, health, whoop: whoopToday, recentWorkouts, activeInjuries, trainToday, history,
    loggingStreak: streaks.logging,
    weightTrend, sleepTrend, caloriesTrend, stepsTrend, recoveryStrainTrend, hrvTrend,
    hiddenWidgets: prefs?.hidden_widgets ?? [],
    mounjaroEnabled: !!prefs?.mounjaro_enabled,
    targets: {
      calorie_target: prefs?.calorie_target ?? 2000,
      protein_target_g: prefs?.protein_target_g ?? 150,
      carbs_target_g: prefs?.carbs_target_g ?? 250,
      fat_target_g: prefs?.fat_target_g ?? 70,
    },
  }
}

export type MainPageData = Awaited<ReturnType<typeof getMainPageData>>
