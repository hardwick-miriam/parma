'use client'

import { JournalWidget } from '@/components/dashboard/JournalWidget'
import type { DailyStats, WorkoutSession } from '@/lib/db/queries'

interface JournalPageClientProps {
  stats: DailyStats | null
  workouts: WorkoutSession[]
  history: DailyStats[]
  initialNotes?: Record<string, string>
}

// Thin page-level wrapper so Journal owns its <h1> the same way every other
// module's *Client component does (JournalWidget itself stays untouched — it's
// a compact card + full-screen detail view, the same shape as MediaWidget).
export function JournalPageClient({ stats, workouts, history, initialNotes }: JournalPageClientProps) {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Journal</h1>
      <JournalWidget stats={stats} workouts={workouts} history={history} initialNotes={initialNotes} />
    </div>
  )
}
