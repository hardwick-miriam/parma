export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTodayStats, getTodayWorkouts } from '@/lib/db/queries'
import { getDailyStatsHistory } from '@/lib/db/history'
import { JournalWidget } from '@/components/dashboard/JournalWidget'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [stats, workouts, history] = await Promise.all([
    getTodayStats(user.id).catch(() => null),
    getTodayWorkouts(user.id).catch(() => []),
    getDailyStatsHistory(user.id, 60).catch(() => []),
  ])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Journal</h1>
      <JournalWidget stats={stats} workouts={workouts} history={history} />
    </div>
  )
}
