'use client'

import { useState, useTransition } from 'react'
import { removeHabit } from '@/app/actions'

export function HabitsWidget({ habits_done }: { habits_done: string[] | null }) {
  const doneHabits = (habits_done ?? []).filter(Boolean)
  const [confirmItem, setConfirmItem] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleRemove(h: string) {
    startTransition(async () => {
      await removeHabit(h)
      setConfirmItem(null)
    })
  }

  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Habits</h2>
      {doneHabits.length === 0 ? (
        <p className="text-text-subtle text-sm">None logged today</p>
      ) : (
        <ul className="flex flex-col divide-y divide-border">
          {doneHabits.map((h) => (
            <li key={h} className="group flex items-center py-2.5 first:pt-0 last:pb-0">
              {confirmItem === h ? (
                <div className="flex items-center gap-2 w-full">
                  <span className="flex-1 text-sm text-text-muted capitalize">{h}</span>
                  <span className="text-xs text-text-muted">Remove?</span>
                  <button
                    onClick={() => handleRemove(h)}
                    disabled={isPending}
                    className="text-xs text-red-400 font-medium hover:text-red-300 disabled:opacity-50"
                  >
                    Yes
                  </button>
                  <button
                    onClick={() => setConfirmItem(null)}
                    className="text-xs text-text-subtle hover:text-text-muted"
                  >
                    No
                  </button>
                </div>
              ) : (
                <>
                  <span className="text-accent font-bold mr-2">✓</span>
                  <span className="flex-1 text-sm text-text capitalize">{h}</span>
                  <button
                    onClick={() => setConfirmItem(h)}
                    className="opacity-0 group-hover:opacity-100 text-text-subtle hover:text-red-400 transition-opacity text-base leading-none px-1"
                    title="Remove habit"
                  >
                    ×
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      {doneHabits.length > 0 && (
        <p className="text-xs text-text-subtle">
          {doneHabits.length} habit{doneHabits.length !== 1 ? 's' : ''} done
        </p>
      )}
    </div>
  )
}
