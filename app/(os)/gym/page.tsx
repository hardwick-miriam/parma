export const dynamic = 'force-dynamic'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getRecentWorkouts } from '@/lib/db/queries'
import { getLocalDate } from '@/lib/date'
import { PRTrackerWidget } from '@/components/dashboard/widgets/PRTrackerWidget'
import { TrainingLoadWidget } from '@/components/dashboard/widgets/TrainingLoadWidget'
import { RoutineSection } from '@/components/settings/RoutineSection'
import { ExerciseHistory } from '@/components/os/ExerciseHistory'
import { ModulePageClient } from '@/components/os/ModulePageClient'

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

  const recentWorkouts = await getRecentWorkouts(user.id, 90).catch(() => [])
  const restDays = daysSinceRest(recentWorkouts)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Gym</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <ModulePageClient w={8} h={5}>
          <TrainingLoadWidget recentWorkouts={recentWorkouts} />
        </ModulePageClient>

        <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col justify-center gap-1">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Days since rest</p>
          <p className="text-3xl font-bold text-text tabular-nums">{restDays}</p>
          <p className="text-xs text-text-subtle">{restDays === 0 ? "Rested today" : `${restDays} consecutive training day${restDays === 1 ? '' : 's'}`}</p>
        </div>
      </div>

      <ModulePageClient w={8} h={6}>
        <PRTrackerWidget />
      </ModulePageClient>

      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-3">Routine</p>
        <RoutineSection />
      </div>

      <ExerciseHistory recentWorkouts={recentWorkouts} />

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

      {/* Deliberately not built this session — clearly-marked space per the brief */}
      <div
        className="rounded-2xl border border-dashed p-6 flex flex-col items-center gap-1 text-center"
        style={{ borderColor: 'var(--border-strong)' }}
      >
        <span className="text-2xl" aria-hidden>🏗️</span>
        <p className="text-sm font-semibold text-text-muted">Live set-by-set logger</p>
        <p className="text-xs text-text-faint">Coming in Session 2 — real-time sets, reps, and weight per exercise.</p>
      </div>
    </div>
  )
}
