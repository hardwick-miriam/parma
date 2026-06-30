'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'

interface Insight {
  title: string
  insight: string
  type: 'correlation' | 'trend' | 'pattern' | 'consistency'
}

const TYPE_COLOR: Record<string, string> = {
  correlation: 'var(--accent)',
  trend: 'var(--positive)',
  pattern: 'var(--warning)',
  consistency: 'var(--text-muted)',
}

const TYPE_LABEL: Record<string, string> = {
  correlation: 'Correlation',
  trend: 'Trend',
  pattern: 'Pattern',
  consistency: 'Consistency',
}

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: 'easeOut' as const },
  }),
}

export function InsightsClient() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(0)
  const [insufficient, setInsufficient] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const cached = localStorage.getItem('parma-insights')
    const cacheTime = localStorage.getItem('parma-insights-time')
    const isRecent = cacheTime && Date.now() - Number(cacheTime) < 6 * 60 * 60 * 1000 // 6h

    if (cached && isRecent) {
      const { insights: ci, days: cd, insufficient: ci2 } = JSON.parse(cached)
      setInsights(ci)
      setDays(cd)
      setInsufficient(ci2)
      setLoading(false)
      return
    }

    fetch('/api/insights')
      .then((r) => r.json())
      .then((data) => {
        setInsights(data.insights ?? [])
        setDays(data.days ?? 0)
        setInsufficient(data.insufficient ?? false)
        localStorage.setItem('parma-insights', JSON.stringify(data))
        localStorage.setItem('parma-insights-time', String(Date.now()))
      })
      .catch(() => setError('Failed to load insights'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-text">Insights</h1>
        <p className="text-sm text-text-muted mt-0.5">
          {days > 0 ? `Patterns from your last ${days} days` : 'Analysing your health data'}
        </p>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="rounded-2xl bg-surface border border-border p-5 h-28 animate-pulse" />
          ))}
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl bg-surface border border-border p-6 text-center text-text-muted text-sm">
          {error}
        </div>
      )}

      {!loading && insufficient && (
        <div className="rounded-2xl bg-surface border border-border p-6 text-center">
          <p className="text-text-muted text-sm">
            Keep logging — insights appear once you have at least 10 days of data.
          </p>
        </div>
      )}

      {!loading && insights.length > 0 && (
        <div className="flex flex-col gap-3">
          {insights.map((insight, i) => {
            const color = TYPE_COLOR[insight.type] ?? 'var(--text-muted)'
            return (
              <motion.div
                key={i}
                custom={i}
                variants={cardVariants}
                initial="hidden"
                animate="show"
                className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-2"
                style={{ boxShadow: 'var(--shadow-md)' }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-full"
                    style={{ color, background: `${color}15` }}
                  >
                    {TYPE_LABEL[insight.type] ?? insight.type}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-text">{insight.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed">{insight.insight}</p>
              </motion.div>
            )
          })}

          <button
            className="mt-2 text-xs text-text-subtle hover:text-text-muted transition-colors"
            onClick={() => {
              localStorage.removeItem('parma-insights')
              localStorage.removeItem('parma-insights-time')
              setLoading(true)
              setInsights([])
              fetch('/api/insights')
                .then((r) => r.json())
                .then((data) => {
                  setInsights(data.insights ?? [])
                  setDays(data.days ?? 0)
                  localStorage.setItem('parma-insights', JSON.stringify(data))
                  localStorage.setItem('parma-insights-time', String(Date.now()))
                })
                .finally(() => setLoading(false))
            }}
          >
            Refresh analysis
          </button>
        </div>
      )}
    </div>
  )
}
