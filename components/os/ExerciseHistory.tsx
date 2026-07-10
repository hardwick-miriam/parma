'use client'

import { useMemo, useState } from 'react'
import type { WorkoutSession } from '@/lib/db/queries'

// Per-exercise history built from real logged workout sessions only — no
// set/rep/weight trend here since that granular data doesn't exist yet (no
// live logger this session, deliberately deferred). This shows genuine
// session-level history: which days you did an exercise, in what session,
// how it felt, how long — not fabricated stats.
export function ExerciseHistory({ recentWorkouts }: { recentWorkouts: WorkoutSession[] }) {
  const exerciseNames = useMemo(() => {
    const set = new Set<string>()
    for (const w of recentWorkouts) {
      for (const ex of w.exercises ?? []) set.add(ex)
    }
    return Array.from(set).sort()
  }, [recentWorkouts])

  const [selected, setSelected] = useState<string>(exerciseNames[0] ?? '')

  const sessions = useMemo(() => {
    if (!selected) return []
    return recentWorkouts
      .filter((w) => (w.exercises ?? []).includes(selected))
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [recentWorkouts, selected])

  if (!exerciseNames.length) {
    return (
      <div className="rounded-2xl bg-surface border border-border p-5">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Per-exercise history</p>
        <p className="text-sm text-text-subtle">No exercises logged yet in the last 90 days.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Per-exercise history</p>
        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg bg-surface-elevated border border-border text-text text-xs px-2.5 py-1.5 focus:outline-none focus:border-accent capitalize"
        >
          {exerciseNames.map((name) => <option key={name} value={name}>{name}</option>)}
        </select>
      </div>

      {sessions.length === 0 ? (
        <p className="text-sm text-text-subtle">No sessions found for this exercise.</p>
      ) : (
        <>
          <p className="text-xs text-text-faint">{sessions.length} session{sessions.length === 1 ? '' : 's'} in the last 90 days</p>
          <ol className="flex flex-col divide-y divide-border">
            {sessions.map((s) => (
              <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-text">{s.date}</p>
                  <p className="text-xs text-text-subtle">{s.description}</p>
                </div>
                <div className="text-right text-xs text-text-faint">
                  {s.duration_minutes != null && <p>{s.duration_minutes}min</p>}
                  {s.feeling && <p className="capitalize">{s.feeling}</p>}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </div>
  )
}
