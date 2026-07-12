export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getTodayStats, getTodayWorkouts } from '@/lib/db/queries'
import { getDailyStatsHistory } from '@/lib/db/history'
import { getJournalNotes } from '@/lib/db/journal'
import { JournalPageClient } from '@/components/os/JournalPageClient'

export default async function JournalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [stats, workouts, history, notes] = await Promise.all([
    getTodayStats(user.id).catch(() => null),
    getTodayWorkouts(user.id).catch(() => []),
    getDailyStatsHistory(user.id, 60).catch(() => []),
    getJournalNotes(user.id, 90).catch(() => []),
  ])
  const initialNotes: Record<string, string> = {}
  for (const n of notes) initialNotes[n.note_date] = n.note

  return <JournalPageClient stats={stats} workouts={workouts} history={history} initialNotes={initialNotes} />
}
