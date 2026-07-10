export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import {
  getTodayStats,
  getTodayWorkouts,
  getRecentWorkouts,
  getHealthStatus,
  getTodayLogEntries,
  getInjuriesWithCheckins,
  getResolvedInjuriesWithCheckins,
} from '@/lib/db/queries'
import { getDailyStatsHistory } from '@/lib/db/history'
import { calculateStreaks } from '@/lib/streaks'
import { getMounjaroDoses, getMounjaroEffects } from '@/lib/db/mounjaro'
import { getUserPreferences } from '@/lib/db/preferences'
import { getWhoopConnection, getLatestWhoopMetrics, getWhoopMetrics } from '@/lib/db/whoop'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'
import { RealtimeSync } from '@/components/dashboard/RealtimeSync'
import { OnboardingTour } from '@/components/OnboardingTour'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [stats, workouts, recentWorkouts, health, logEntries, injuries, pastInjuries, history, prefs] = await Promise.all([
    user ? getTodayStats(user.id).catch(() => null) : null,
    user ? getTodayWorkouts(user.id).catch(() => []) : [],
    user ? getRecentWorkouts(user.id, 90).catch(() => []) : [],
    user ? getHealthStatus(user.id).catch(() => null) : null,
    user ? getTodayLogEntries(user.id).catch(() => []) : [],
    user ? getInjuriesWithCheckins(user.id).catch(() => []) : [],
    user ? getResolvedInjuriesWithCheckins(user.id).catch(() => []) : [],
    user ? getDailyStatsHistory(user.id, 60).catch(() => []) : [],
    user ? getUserPreferences(user.id).catch(() => null) : null,
  ])

  const mounjaroEnabled = prefs?.mounjaro_enabled ?? false

  // Check WHOOP connection and load metrics if connected
  const whoopConn = user ? await getWhoopConnection(user.id).catch(() => null) : null
  const whoopConnected = !!whoopConn

  const [mounjaroDoses, mounjaroEffects, whoopToday, whoopHistory] = await Promise.all([
    user && mounjaroEnabled ? getMounjaroDoses(user.id, 90).catch(() => []) : [],
    user && mounjaroEnabled ? getMounjaroEffects(user.id, 90).catch(() => []) : [],
    user && whoopConnected ? getLatestWhoopMetrics(user.id).catch(() => null) : null,
    user && whoopConnected ? getWhoopMetrics(user.id, 10).catch(() => []) : [],
  ])

  const workoutDates = new Set((recentWorkouts ?? []).map((w) => w.date))
  const streaks = calculateStreaks(history ?? [], workoutDates)

  // Explicit timeZone — without it this resolves in the server's local zone
  // (UTC on Vercel), showing the wrong weekday/date for up to an hour after
  // local midnight in the UK.
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', timeZone: 'Europe/London',
  })

  return (
    <>
    {user && <RealtimeSync userId={user.id} />}
    {user && <OnboardingTour />}
    <DashboardGrid
      stats={stats}
      workouts={workouts ?? []}
      recentWorkouts={recentWorkouts ?? []}
      health={health}
      logEntries={logEntries ?? []}
      injuries={injuries ?? []}
      pastInjuries={pastInjuries ?? []}
      today={today}
      streaks={streaks}
      history={history ?? []}
      mounjaroEnabled={mounjaroEnabled}
      mounjaroDoses={mounjaroDoses}
      mounjaroEffects={mounjaroEffects}
      weightGoal={prefs?.weight_goal_kg ?? null}
      savedLayouts={(prefs?.layouts as Record<string, unknown>) ?? {}}
      savedHiddenWidgets={prefs?.hidden_widgets ?? []}
      whoopConnected={whoopConnected}
      whoopToday={whoopToday}
      whoopHistory={whoopHistory ?? []}
      weatherBgEnabled={prefs?.weather_bg_enabled ?? false}
    />
    </>
  )
}
