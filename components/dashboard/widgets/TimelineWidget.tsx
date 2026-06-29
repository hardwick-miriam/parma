'use client'

import type { LogEntry } from '@/lib/db/queries'

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function TimelineWidget({ entries }: { entries: LogEntry[] }) {
  return (
    <div className="rounded-2xl bg-surface p-6 flex flex-col gap-4">
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Today's Log</h2>
      {entries.length === 0 ? (
        <p className="text-text-subtle text-sm">Nothing logged yet — speak or type below</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3">
              <span className="text-xs text-text-subtle tabular-nums pt-0.5 w-16 shrink-0">
                {formatTime(entry.logged_at)}
              </span>
              <span className="text-sm text-text leading-relaxed">{entry.raw_text}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
