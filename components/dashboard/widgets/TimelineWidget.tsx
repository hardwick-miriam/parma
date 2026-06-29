'use client'

import { useState, useTransition } from 'react'
import { deleteLogEntry } from '@/app/actions'
import type { LogEntry } from '@/lib/db/queries'

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

function TrashIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  )
}

export function TimelineWidget({ entries }: { entries: LogEntry[] }) {
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleDelete(id: string) {
    startTransition(async () => {
      await deleteLogEntry(id)
      setConfirmId(null)
    })
  }

  return (
    <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col gap-4" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest">Today's Log</h2>
      {entries.length === 0 ? (
        <p className="text-text-subtle text-sm">Nothing logged yet — speak or type below</p>
      ) : (
        <ol className="flex flex-col divide-y divide-border">
          {entries.map((entry) => (
            <li key={entry.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <span className="text-xs text-text-subtle tabular-nums pt-0.5 w-16 shrink-0">
                {formatTime(entry.logged_at)}
              </span>
              <span className="flex-1 text-sm text-text leading-relaxed">{entry.raw_text}</span>

              {confirmId === entry.id ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs text-text-muted">Delete?</span>
                  <button
                    onClick={() => handleDelete(entry.id)}
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
                  onClick={() => setConfirmId(entry.id)}
                  className="shrink-0 p-1 text-text-subtle opacity-0 group-hover:opacity-100 hover:text-red-400 transition-opacity"
                  title="Delete entry"
                >
                  <TrashIcon />
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
