'use client'

const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: '🔥', label: 'Great', color: 'text-accent' },
  good:  { emoji: '😊', label: 'Good',  color: 'text-green-400' },
  okay:  { emoji: '😐', label: 'Okay',  color: 'text-yellow-400' },
  low:   { emoji: '😕', label: 'Low',   color: 'text-orange-400' },
  bad:   { emoji: '😞', label: 'Bad',   color: 'text-red-400' },
}

export function MoodWidget({ mood }: { mood: string | null }) {
  const config = mood ? MOOD_CONFIG[mood] : null

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-3 h-full" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Mood</h2>
      {config ? (
        <div className="flex flex-col items-center gap-1 py-2">
          <span className="text-5xl">{config.emoji}</span>
          <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
        </div>
      ) : (
        <p className="text-text-subtle text-sm text-center py-4">Not logged today</p>
      )}
    </div>
  )
}
