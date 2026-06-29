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
import { NutritionWidget } from '@/components/dashboard/widgets/NutritionWidget'
import { StepsWidget } from '@/components/dashboard/widgets/StepsWidget'
import { WorkoutsWidget } from '@/components/dashboard/widgets/WorkoutsWidget'
import { MoodWidget } from '@/components/dashboard/widgets/MoodWidget'
import { SleepWidget } from '@/components/dashboard/widgets/SleepWidget'
import { HydrationWidget } from '@/components/dashboard/widgets/HydrationWidget'
import { WeightWidget } from '@/components/dashboard/widgets/WeightWidget'
import { SupplementsWidget } from '@/components/dashboard/widgets/SupplementsWidget'
import { HabitsWidget } from '@/components/dashboard/widgets/HabitsWidget'
import { HealthStatusWidget } from '@/components/dashboard/widgets/HealthStatusWidget'
import { TimelineWidget } from '@/components/dashboard/widgets/TimelineWidget'
import { InjuryWidget } from '@/components/dashboard/widgets/InjuryWidget'
import { LogFlow } from '@/components/dashboard/LogFlow'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [stats, workouts, health, logEntries, injuries, pastInjuries] = await Promise.all([
    user ? getTodayStats(user.id).catch(() => null) : null,
    user ? getTodayWorkouts(user.id).catch(() => []) : [],
    user ? getHealthStatus(user.id).catch(() => null) : null,
    user ? getTodayLogEntries(user.id).catch(() => []) : [],
    user ? getInjuriesWithCheckins(user.id).catch(() => []) : [],
    user ? getResolvedInjuriesWithCheckins(user.id).catch(() => []) : [],
  ])

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  })

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Today</h1>
        <p className="text-sm text-text-muted mt-0.5">{today}</p>
      </div>

      <HealthStatusWidget status={health} />
      <InjuryWidget injuries={injuries ?? []} pastInjuries={pastInjuries ?? []} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <NutritionWidget calories={stats?.calories ?? 0} protein_g={stats?.protein_g ?? 0} />
        <StepsWidget steps={stats?.steps ?? 0} />
        <SleepWidget hours={stats?.sleep_hours ?? null} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <HydrationWidget water_ml={stats?.water_ml ?? 0} />
        <WeightWidget weight_kg={stats?.weight_kg ?? null} />
        <MoodWidget mood={stats?.mood ?? null} />
        <WorkoutsWidget workouts={workouts} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <HabitsWidget habits_done={stats?.habits_done ?? null} />
        <SupplementsWidget supplements={stats?.supplements ?? null} />
      </div>

      <TimelineWidget entries={logEntries ?? []} />

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
