export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTodayStats, getTodayWorkouts } from '@/lib/db/queries'
import { NutritionWidget } from '@/components/dashboard/widgets/NutritionWidget'
import { StepsWidget } from '@/components/dashboard/widgets/StepsWidget'
import { WorkoutsWidget } from '@/components/dashboard/widgets/WorkoutsWidget'
import { LogFlow } from '@/components/dashboard/LogFlow'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [stats, workouts] = await Promise.all([
    user ? getTodayStats(user.id) : null,
    user ? getTodayWorkouts(user.id) : [],
  ])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Today</h1>
        <p className="text-sm text-text-muted mt-0.5">{today}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NutritionWidget
          calories={stats?.calories ?? 0}
          protein_g={stats?.protein_g ?? 0}
        />
        <StepsWidget steps={stats?.steps ?? 0} />
        <WorkoutsWidget workouts={workouts} />
      </div>

      <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
        <div>
          <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
            Log something
          </h2>
          <p className="text-xs text-text-subtle mt-1">
            Speak or type naturally — AI parses the rest
          </p>
        </div>
        <LogFlow />
      </div>
    </div>
  )
}
