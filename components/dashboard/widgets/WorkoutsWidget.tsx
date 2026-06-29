'use client'

import { useState, useTransition } from 'react'
import { deleteWorkout } from '@/app/actions'
import type { WorkoutSession } from '@/lib/db/queries'

const feelingEmoji: Record<string, string> = {
  great: '🔥',
  good: '💪',
  okay: '👍',
  tired: '😓',
  rough: '😤',
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function WorkoutsWidget({ workouts }: { workouts: WorkoutSession[] }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteWorkout(id)
      setConfirmId(null)
    })
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
        Workouts
      </h2>
      {workouts.length === 0 ? (
        <p className="text-text-subtle text-sm">No workouts logged today</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {workouts.map((w) => (
            <li key={w.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="text-lg leading-tight mt-0.5">
                {w.feeling ? (feelingEmoji[w.feeling] ?? '💪') : '💪'}
              </span>
              <div className="flex-1 flex flex-col min-w-0">
                <span className="text-sm font-medium text-text truncate">{w.description}</span>
                {w.duration_minutes != null && (
                  <span className="text-xs text-text-muted">{w.duration_minutes} min</span>
                )}
                {w.exercises?.length ? (
                  <span className="text-xs text-text-subtle truncate">
                    {w.exercises.join(' · ')}
                  </span>
                ) : null}
              </div>

              {confirmId === w.id ? (
                <div className="flex items-center gap-2 shrink-0 pt-0.5">
                  <span className="text-xs text-text-muted">Delete?</span>
                  <button
                    onClick={() => handleDelete(w.id)}
                    disabled={isPending}
                    className="text-xs text-red-400 font-medium hover:text-red-300 disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmId(null)}
                    className="text-xs text-text-subtle hover:text-text-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmId(w.id)}
                  className="shrink-0 p-1 text-text-subtle opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity mt-0.5"
                  title="Delete workout"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
