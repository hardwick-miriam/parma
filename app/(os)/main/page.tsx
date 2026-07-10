export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTodayStats, getHealthStatus, getRecentWorkouts } from '@/lib/db/queries'
import { getWhoopConnection, getLatestWhoopMetrics } from '@/lib/db/whoop'
import { getUserPreferences } from '@/lib/db/preferences'
import { MainClient } from '@/components/os/MainClient'

export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const whoopConn = await getWhoopConnection(user.id).catch(() => null)

  const [stats, health, recentWorkouts, prefs, whoopToday] = await Promise.all([
    getTodayStats(user.id).catch(() => null),
    getHealthStatus(user.id).catch(() => null),
    getRecentWorkouts(user.id, 30).catch(() => []),
    getUserPreferences(user.id).catch(() => null),
    whoopConn ? getLatestWhoopMetrics(user.id).catch(() => null) : null,
  ])

  return (
    <MainClient
      stats={stats}
      health={health}
      whoop={whoopToday}
      recentWorkouts={recentWorkouts}
      targets={{
        calorie_target: prefs?.calorie_target ?? 2000,
        protein_target_g: prefs?.protein_target_g ?? 150,
        carbs_target_g: prefs?.carbs_target_g ?? 250,
        fat_target_g: prefs?.fat_target_g ?? 70,
      }}
    />
  )
}
