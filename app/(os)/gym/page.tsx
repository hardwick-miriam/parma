export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRecentWorkouts } from '@/lib/db/queries'
import { getUserPreferences } from '@/lib/db/preferences'
import { getLocalDate } from '@/lib/date'
import { PRTrackerWidget } from '@/components/dashboard/widgets/PRTrackerWidget'
import { TrainingLoadWidget } from '@/components/dashboard/widgets/TrainingLoadWidget'
import { RoutineSection } from '@/components/settings/RoutineSection'
import { ExerciseHistory } from '@/components/os/ExerciseHistory'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { TappableWidget } from '@/components/os/TappableWidget'
import { LiveLogger } from '@/components/os/LiveLogger'

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

export default async function GymPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [recentWorkouts, prefs] = await Promise.all([
    getRecentWorkouts(user.id, 90).catch(() => []),
    getUserPreferences(user.id).catch(() => null),
  ])
  const restDays = daysSinceRest(recentWorkouts)
  const hiddenWidgets = new Set(prefs?.hidden_widgets ?? [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Gym</h1>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Log a set</p>
        <LiveLogger />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Training status</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {!hiddenWidgets.has('trainload') && (
            <TappableWidget widgetId="trainload" recentWorkouts={recentWorkouts}>
              <ModulePageClient w={8} h={5}>
                <TrainingLoadWidget recentWorkouts={recentWorkouts} />
              </ModulePageClient>
            </TappableWidget>
          )}

          <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-center gap-1">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Days since rest</p>
            <p className="text-3xl font-bold text-text tabular-nums">{restDays}</p>
            <p className="text-xs text-text-subtle">{restDays === 0 ? "Rested today" : `${restDays} consecutive training day${restDays === 1 ? '' : 's'}`}</p>
          </div>
        </div>
      </div>

      {!hiddenWidgets.has('prtracker') && (
        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Personal records</p>
          <TappableWidget widgetId="prtracker">
            <ModulePageClient w={8} h={6}>
              <PRTrackerWidget />
            </ModulePageClient>
          </TappableWidget>
        </div>
      )}

      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Routine</p>
        <RoutineSection />
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Recent exercises</p>
        <ExerciseHistory recentWorkouts={recentWorkouts} />
      </div>

      <Link
        href="/body"
        className="rounded-2xl border border-border p-5 flex items-center justify-between hover:border-border-strong transition-colors"
        style={{ background: 'var(--surface)' }}
      >
        <div>
          <p className="text-sm font-semibold text-text">Muscle map &amp; recovery figure</p>
          <p className="text-xs text-text-subtle">See per-muscle load and injury overlays</p>
        </div>
        <span className="text-2xl" aria-hidden>🫁</span>
      </Link>
    </div>
  )
}
