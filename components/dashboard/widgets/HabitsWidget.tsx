'use client'

const DEFAULT_HABITS = [
  'shower', 'walk', 'exercise', 'meditate', 'journaling',
  'saw friends', 'read', 'healthy meal', 'stretched', 'cold shower',
  'no alcohol', 'no caffeine',
]

export function HabitsWidget({ habits_done }: { habits_done: string[] | null }) {
  const done = new Set((habits_done ?? []).map((h) => h.toLowerCase()))

  // Show done habits first, then remaining defaults that weren't done
  const doneHabits = (habits_done ?? []).filter(Boolean)

  // Any done habits not in the default list (AI-detected custom ones)
  const extraDone = doneHabits.filter((h) => !DEFAULT_HABITS.includes(h.toLowerCase()))

  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Habits</h2>
      {done.size === 0 ? (
        <p className="text-text-subtle text-sm">None logged today</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {[...doneHabits].map((h) => (
            <li key={h} className="flex items-center gap-2 text-sm">
              <span className="text-accent font-bold">✓</span>
              <span className="text-text capitalize">{h}</span>
            </li>
          ))}
        </ul>
      )}
      {done.size > 0 && (
        <p className="text-xs text-text-subtle">
          {done.size} habit{done.size !== 1 ? 's' : ''} done
        </p>
      )}
    </div>
  )
}
