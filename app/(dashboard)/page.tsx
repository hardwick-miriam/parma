export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import {
  getTodayStats,
  getTodayWorkouts,
  getHealthStatus,
  getTodayLogEntries,
  getInjuriesWithCheckins,
  getResolvedInjuriesWithCheckins,
} from '@/lib/db/queries'
import { getDailyStatsHistory } from '@/lib/db/history'
import { calculateStreaks } from '@/lib/streaks'
import { DashboardGrid } from '@/components/dashboard/DashboardGrid'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [stats, workouts, health, logEntries, injuries, pastInjuries, history] = await Promise.all([
    user ? getTodayStats(user.id).catch(() => null) : null,
    user ? getTodayWorkouts(user.id).catch(() => []) : [],
    user ? getHealthStatus(user.id).catch(() => null) : null,
    user ? getTodayLogEntries(user.id).catch(() => []) : [],
    user ? getInjuriesWithCheckins(user.id).catch(() => []) : [],
    user ? getResolvedInjuriesWithCheckins(user.id).catch(() => []) : [],
    user ? getDailyStatsHistory(user.id, 60).catch(() => []) : [],
  ])

  const streaks = calculateStreaks(history ?? [])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <DashboardGrid
      stats={stats}
      workouts={workouts ?? []}
      health={health}
      logEntries={logEntries ?? []}
      injuries={injuries ?? []}
      pastInjuries={pastInjuries ?? []}
      today={today}
      streaks={streaks}
      history={history ?? []}
    />
  )
}
