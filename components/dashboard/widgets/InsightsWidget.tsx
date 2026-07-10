'use client'

import { useEffect, useState, useRef } from 'react'
import { useAutoAnimate } from '@formkit/auto-animate/react'

interface InsightRow {
  id?: string
  type: string
  metric_a?: string | null
  metric_b?: string | null
  title: string
  body: string
  strength?: number | null
}

const TYPE_ICON: Record<string, string> = {
  correlation: '🔗',
  trend: '📈',
  consistency: '⭐',
  week_comparison: '📊',
}

function StrengthBadge({ type, strength }: { type: string; strength?: number | null }) {
  if (strength == null) return null

  if (type === 'correlation') {
    const abs = Math.abs(strength)
    const pct = Math.round(abs * 100)
    const color = abs >= 0.6 ? 'text-green-400' : abs >= 0.4 ? 'text-yellow-400' : 'text-text-muted'
    return <span className={`text-xs font-mono ${color}`}>r={strength.toFixed(2)} ({pct}%)</span>
  }

  if (type === 'week_comparison') {
    const pct = Math.round(strength * 100)
    const color = pct > 0 ? 'text-green-400' : 'text-red-400'
    const sign = pct > 0 ? '+' : ''
    return <span className={`text-xs font-mono font-semibold ${color}`}>{sign}{pct}%</span>
  }

  if (type === 'consistency') {
    const pct = Math.round(strength * 100)
    return <span className="text-xs font-mono text-accent">{pct}%</span>
  }

  return null
}

export function InsightsWidget() {
  const [insights, setInsights] = useState<InsightRow[]>([])
  const [loading, setLoading] = useState(true)
  const [listRef] = useAutoAnimate<HTMLDivElement>()
  const [insufficient, setInsufficient] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/insights')
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.insights ?? [])
        setInsufficient(data.insufficient ?? false)
      })
      // Previously swallowed silently, so a failed fetch looked identical
      // to "no strong patterns found yet" — now distinguishable.
      .catch(() => setError(true))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3 h-full overflow-hidden" style={{ boxShadow: 'var(--shadow-md)' }}>
      <h2 className="text-sm font-semibold text-text-muted uppercase tracking-widest shrink-0">Insights</h2>

      {loading && (
        <div className="flex items-center justify-center flex-1">
          <span className="text-text-subtle text-sm">Computing…</span>
        </div>
      )}

      {!loading && error && (
        <p className="text-text-subtle text-sm text-center py-4">
          Couldn&apos;t load insights — try again shortly.
        </p>
      )}

      {!loading && !error && insufficient && (
        <p className="text-text-subtle text-sm text-center py-4">
          Log at least 10 days of data to see insights.
        </p>
      )}

      {!loading && !error && !insufficient && insights.length === 0 && (
        <p className="text-text-subtle text-sm text-center py-4">
          No strong patterns found yet — keep logging!
        </p>
      )}

      {!loading && insights.length > 0 && (
        <div ref={listRef} className="flex flex-col gap-2 overflow-y-auto">
          {insights.slice(0, 6).map((ins, i) => (
            <div
              key={ins.id ?? i}
              className="flex gap-3 rounded-xl p-3 border border-border"
              style={{ background: 'var(--surface-elevated)' }}
            >
              <span className="text-lg shrink-0 mt-0.5">{TYPE_ICON[ins.type] ?? '💡'}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-text truncate">{ins.title}</span>
                  <StrengthBadge type={ins.type} strength={ins.strength} />
                </div>
                <p className="text-xs text-text-muted leading-relaxed">{ins.body}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
