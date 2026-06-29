'use client'

import type { WorkoutSession } from '@/lib/db/queries'

const feelingEmoji: Record<string, string> = {
  great: '🔥',
  good: '💪',
  okay: '👍',
  tired: '😓',
  rough: '😤',
}

interface WorkoutsWidgetProps {
  workouts: WorkoutSession[]
}

export function WorkoutsWidget({ workouts }: WorkoutsWidgetProps) {
  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">
        Workouts
      </h2>
      {workouts.length === 0 ? (
        <p className="text-text-subtle text-sm">No workouts logged today</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {workouts.map((w) => (
            <li key={w.id} className="flex items-start gap-3">
              <span className="text-lg leading-tight mt-0.5">
                {w.feeling ? (feelingEmoji[w.feeling] ?? '💪') : '💪'}
              </span>
              <div className="flex flex-col min-w-0">
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
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
