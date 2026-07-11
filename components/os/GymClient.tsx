'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { PRTrackerWidget } from '@/components/dashboard/widgets/PRTrackerWidget'
import { TrainingLoadWidget } from '@/components/dashboard/widgets/TrainingLoadWidget'
import { RoutineSection } from '@/components/settings/RoutineSection'
import { ExerciseHistory } from '@/components/os/ExerciseHistory'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { TappableWidget } from '@/components/os/TappableWidget'
import { LiveLogger } from '@/components/os/LiveLogger'
import type { GymPageData } from '@/lib/pageData/gym'

export function GymClient({ initialData }: { initialData: GymPageData }) {
  const { data } = useQuery({
    queryKey: ['gym-summary'],
    queryFn: async () => {
      const res = await fetch('/api/gym-summary')
      if (!res.ok) throw new Error('Failed to load Gym summary')
      return res.json() as Promise<GymPageData>
    },
    initialData,
  })
  const { recentWorkouts, restDays, hiddenWidgets } = data
  const hidden = new Set(hiddenWidgets)

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
          {!hidden.has('trainload') && (
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

      {!hidden.has('prtracker') && (
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
