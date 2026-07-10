export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getRecentWorkouts, getInjuriesWithCheckins } from '@/lib/db/queries'
import { getWhoopMetrics } from '@/lib/db/whoop'
import { computeMuscleRecovery } from '@/lib/muscleRecovery'
import { BodyWidget } from '@/components/dashboard/widgets/BodyWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import type { WorkoutSession } from '@/lib/db/queries'

export default async function BodyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [recentWorkouts, injuries, whoopHistory] = await Promise.all([
    getRecentWorkouts(user.id, 90).catch(() => []),
    getInjuriesWithCheckins(user.id).catch(() => []),
    getWhoopMetrics(user.id, 10).catch(() => []),
  ])

  const sessions = recentWorkouts.map((w: WorkoutSession & { whoop_strain?: number }) => ({
    date: w.date,
    exercises: w.exercises ?? [],
    whoopStrain: w.whoop_strain,
  }))
  const whoopHist = whoopHistory.map((wh) => ({ date: wh.date, score: wh.recovery_score ?? 0 }))
  const recoveryMap = computeMuscleRecovery(sessions, [], whoopHist, {})

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Body</h1>
      <ModulePageClient w={10} h={9}>
        <BodyWidget recentWorkouts={recentWorkouts} activeInjuries={injuries} recoveryMap={recoveryMap} />
      </ModulePageClient>
    </div>
  )
}
