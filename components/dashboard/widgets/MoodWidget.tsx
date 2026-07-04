'use client'

import { useGridItemSize } from '@/components/dashboard/GridItemSizeContext'

const MOOD_CONFIG: Record<string, { emoji: string; label: string; color: string }> = {
  great: { emoji: '🔥', label: 'Great', color: 'text-accent' },
  good:  { emoji: '😊', label: 'Good',  color: 'text-green-400' },
  okay:  { emoji: '😐', label: 'Okay',  color: 'text-yellow-400' },
  low:   { emoji: '😕', label: 'Low',   color: 'text-orange-400' },
  bad:   { emoji: '😞', label: 'Bad',   color: 'text-red-400' },
}

export function MoodWidget({ mood }: { mood: string | null }) {
  const { w, h } = useGridItemSize()
  const compact = w <= 2 || h <= 3
  const config = mood ? MOOD_CONFIG[mood] : null

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-2 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-xs font-semibold text-text-muted uppercase tracking-widest truncate">Mood</h2>
      {config ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-1">
          <span className={compact ? 'text-4xl' : 'text-5xl'}>{config.emoji}</span>
          {!compact && <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>}
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-text-subtle text-xs text-center">Not logged</p>
        </div>
      )}
    </div>
  )
}
