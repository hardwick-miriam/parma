export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTodayStats, getHealthStatus, getRecentWorkouts, getActiveInjuries } from '@/lib/db/queries'
import { getWhoopConnection, getLatestWhoopMetrics } from '@/lib/db/whoop'
import { getUserPreferences } from '@/lib/db/preferences'
import { getBriefing } from '@/lib/db/briefings'
import { getLocalDate, getWeekdayName } from '@/lib/date'
import { getWhoopMetrics } from '@/lib/db/whoop'
import { getDailyStatsHistory } from '@/lib/db/history'
import { computeMuscleRecovery } from '@/lib/muscleRecovery'
import { trainTodayLine } from '@/lib/trainToday'
import { calculateStreaks } from '@/lib/streaks'
import { MainClient } from '@/components/os/MainClient'
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

// getBriefing itself already returns null (no throw) for the genuine "no
// briefing generated yet" case — so anything it does throw is a real
// failure (RLS, connection, etc) and must be logged, not silently folded
// into the same "no briefing yet" fallback the UI shows either way.
async function getBriefingSafe(userId: string, date: string, supabase: SupabaseClient) {
  try {
    return await getBriefing(userId, date, supabase)
  } catch (err) {
    console.error('[main] getBriefing failed:', err)
    return null
  }
}

export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const whoopConn = await getWhoopConnection(user.id).catch(() => null)

  const [stats, health, recentWorkouts, prefs, whoopToday, briefing, activeInjuries, whoopHistory, activeRoutine, history] = await Promise.all([
    getTodayStats(user.id).catch(() => null),
    getHealthStatus(user.id).catch(() => null),
    getRecentWorkouts(user.id, 90).catch(() => []),
    getUserPreferences(user.id).catch(() => null),
    whoopConn ? getLatestWhoopMetrics(user.id).catch(() => null) : null,
    getBriefingSafe(user.id, getLocalDate(), supabase),
    getActiveInjuries(user.id).catch(() => []),
    whoopConn ? getWhoopMetrics(user.id, 14).catch(() => []) : Promise.resolve([]),
    getActiveRoutineRow(supabase, user.id),
    getDailyStatsHistory(user.id, 90).catch(() => []),
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

  return (
    <MainClient
      stats={stats}
      health={health}
      whoop={whoopToday}
      recentWorkouts={recentWorkouts}
      briefing={briefing?.content ?? null}
      activeInjuries={activeInjuries}
      trainToday={trainToday}
      history={history}
      loggingStreak={streaks.logging}
      weightTrend={weightTrend}
      sleepTrend={sleepTrend}
      caloriesTrend={caloriesTrend}
      stepsTrend={stepsTrend}
      recoveryStrainTrend={recoveryStrainTrend}
      hrvTrend={hrvTrend}
      hiddenWidgets={new Set(prefs?.hidden_widgets ?? [])}
      mounjaroEnabled={!!prefs?.mounjaro_enabled}
      targets={{
        calorie_target: prefs?.calorie_target ?? 2000,
        protein_target_g: prefs?.protein_target_g ?? 150,
        carbs_target_g: prefs?.carbs_target_g ?? 250,
        fat_target_g: prefs?.fat_target_g ?? 70,
      }}
    />
  )
}
