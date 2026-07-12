'use client'

import { useQuery } from '@tanstack/react-query'

interface InsightRow {
  type: string
  metric_a: string | null
  metric_b: string | null
  title: string
  body: string
  strength: number | null
}

function StrengthBar({ strength }: { strength: number | null }) {
  const r = strength ?? 0
  const pct = Math.min(100, Math.abs(r) * 100)
  const positive = r >= 0
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: positive ? 'var(--positive)' : 'var(--negative)' }}
        />
      </div>
      <span className="text-[10px] text-text-faint tabular-nums w-10 text-right">r={r.toFixed(2)}</span>
    </div>
  )
}

export function MoodCorrelationsSection() {
  const query = useQuery({
    queryKey: ['mood-correlations'],
    queryFn: async () => {
      const res = await fetch('/api/insights')
      if (!res.ok) throw new Error('Failed to load insights')
      return (await res.json()) as { insights: InsightRow[]; insufficient?: boolean; days?: number }
    },
  })

  const moodInsights = (query.data?.insights ?? []).filter(
    (i) => i.metric_a === 'mood' || i.metric_b === 'mood'
  )

  return (
    <div className="rounded-2xl bg-surface border border-border p-4 flex flex-col gap-3">
      <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Mood correlations</p>

      {query.isLoading && (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-4 rounded bg-surface-elevated animate-pulse" />)}
        </div>
      )}

      {!query.isLoading && query.data?.insufficient && (
        <p className="text-sm text-text-subtle">Still learning — not enough days logged yet to find patterns.</p>
      )}

      {!query.isLoading && !query.data?.insufficient && moodInsights.length === 0 && (
        <p className="text-sm text-text-subtle">Still learning — no strong mood pattern found yet in your data.</p>
      )}

      {moodInsights.map((i, idx) => (
        <div key={idx} className="flex flex-col gap-1.5 py-1 border-t border-border first:border-0 first:pt-0">
          <p className="text-sm font-medium text-text">{i.title}</p>
          <p className="text-xs text-text-subtle">{i.body}</p>
          <StrengthBar strength={i.strength} />
        </div>
      ))}
    </div>
  )
}
