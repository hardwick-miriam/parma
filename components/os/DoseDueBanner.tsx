'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'

interface DueStatus {
  cadenceDays: number | null
  nextDate: string | null
  due: 'today' | 'tomorrow' | 'overdue' | null
}

/** One nudge per visit — dismissal is keyed to today's date + due state, so it naturally resurfaces once the situation changes (e.g. tomorrow). */
function dismissKey(status: DueStatus) {
  return `parma-dose-due-dismissed-${status.nextDate}-${status.due}`
}

export function DoseDueBanner({ mounjaroEnabled }: { mounjaroEnabled: boolean }) {
  const [dismissed, setDismissed] = useState(false)

  const query = useQuery({
    queryKey: ['mounjaro-due'],
    queryFn: async () => {
      const res = await fetch('/api/mounjaro/due')
      if (!res.ok) throw new Error('Failed to load dose status')
      return (await res.json()) as DueStatus
    },
    enabled: mounjaroEnabled,
  })

  useEffect(() => {
    if (!query.data) return
    try {
      setDismissed(sessionStorage.getItem(dismissKey(query.data)) === '1')
    } catch { /* sessionStorage unavailable */ }
  }, [query.data])

  if (!mounjaroEnabled || !query.data || !query.data.due || dismissed) return null

  const label = query.data.due === 'today' ? 'Mounjaro dose due today'
    : query.data.due === 'tomorrow' ? 'Mounjaro dose due tomorrow'
    : 'Mounjaro dose overdue'

  return (
    <div
      className="rounded-2xl border p-4 flex items-center gap-3"
      style={{ background: 'var(--accent-dim)', borderColor: 'var(--accent)' }}
    >
      <span className="text-lg shrink-0" aria-hidden>💉</span>
      <div className="flex-1">
        <p className="text-sm font-semibold text-text">{label}</p>
        {query.data.cadenceDays && (
          <p className="text-xs text-text-muted mt-0.5">Based on your usual {query.data.cadenceDays}-day cadence</p>
        )}
      </div>
      <button
        onClick={() => {
          setDismissed(true)
          try { sessionStorage.setItem(dismissKey(query.data!), '1') } catch { /* ignore */ }
        }}
        className="shrink-0 text-text-subtle hover:text-text transition-colors text-base leading-none px-1"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  )
}
