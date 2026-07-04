'use client'

import { useState, useEffect, useRef } from 'react'
import type { DailyStats } from '@/lib/db/queries'
import { ShareButton } from '@/components/ui/ShareButton'

interface SummaryCardProps {
  stats: DailyStats | null
  history: DailyStats[]
}

export function SummaryCard({ stats, history }: SummaryCardProps) {
  const [summary, setSummary] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    const hour = new Date().getHours()
    const dow = new Date().getDay()
    const isEvening = hour >= 19
    const isWeekly = dow === 0 && isEvening

    if (!isEvening) return

    const period = isWeekly ? 'weekly' : 'daily'
    const cacheKey = `parma-summary-${period}-${new Date().toISOString().split('T')[0]}`

    const cached = (() => {
      try { return localStorage.getItem(cacheKey) } catch { return null }
    })()

    if (cached) { setSummary(cached); return }
    if (!stats && history.length === 0) return

    fetchedRef.current = true
    setLoading(true)

    fetch('/api/summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ period, stats, history: history.slice(-7) }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.summary) {
          setSummary(data.summary)
          try { localStorage.setItem(cacheKey, data.summary) } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [stats, history])

  if (dismissed || (!summary && !loading)) return null

  const isWeekly = new Date().getDay() === 0

  return (
    <div
      className="rounded-2xl px-5 py-4 flex items-start gap-3"
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border-strong)',
        boxShadow: '0 0 24px rgba(139,92,246,0.08), var(--shadow-md)',
      }}
    >
      <span className="text-accent mt-0.5 shrink-0 text-base">◈</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-text-subtle uppercase tracking-widest mb-1.5">
          {isWeekly ? 'Weekly review' : "Today's readout"}
        </p>
        {loading ? (
          <p className="text-sm text-text-muted italic">Generating summary…</p>
        ) : (
          <p className="text-sm text-text leading-relaxed">{summary}</p>
        )}
      </div>
      <div className="shrink-0 flex items-center gap-1 mt-0.5">
        {!loading && summary && (
          <ShareButton
            type={isWeekly ? 'weekly' : 'daily'}
            className="text-text-subtle hover:text-accent transition-colors p-1 rounded"
          />
        )}
        <button
          onClick={() => setDismissed(true)}
          className="text-text-subtle hover:text-text transition-colors text-lg leading-none px-1"
          aria-label="Dismiss"
        >
          ×
        </button>
      </div>
    </div>
  )
}
