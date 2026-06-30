'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

interface ReviewStats {
  daysLogged: number
  avgCalories: number
  avgProtein: number
  avgSteps: number
  maxSteps: number
  avgHydrationL: string
  startWeight: number | null
  endWeight: number | null
  weightChange: number | null
  moodCounts: Record<string, number>
}

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-text-subtle uppercase tracking-widest">{label}</span>
      <span className="text-xl font-bold text-text tabular-nums">{value}</span>
      {sub && <span className="text-xs text-text-muted">{sub}</span>}
    </div>
  )
}

export function ReviewClient() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState<number>(now.getMonth() + 1) // 1-12, 0 = full year
  const [narrative, setNarrative] = useState<string | null>(null)
  const [stats, setStats] = useState<ReviewStats | null>(null)
  const [periodName, setPeriodName] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function generate() {
    setLoading(true)
    setError(null)
    setNarrative(null)
    setStats(null)

    try {
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month: month || undefined }),
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setNarrative(data.narrative)
      setStats(data.stats)
      setPeriodName(data.periodName)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate review')
    } finally {
      setLoading(false)
    }
  }

  const topMood = stats
    ? Object.entries(stats.moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
    : null

  return (
    <div className="flex flex-col gap-6">
      <div className="pt-1">
        <h1 className="text-2xl font-bold text-text">Review</h1>
        <p className="text-sm text-text-muted mt-0.5">Your health wrapped, by period</p>
      </div>

      {/* Period selector */}
      <div
        className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-4"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              {[now.getFullYear(), now.getFullYear() - 1].map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-text-muted">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-1.5 focus:outline-none focus:border-accent"
            >
              <option value={0}>Full year</option>
              {MONTHS.map((m, i) => (
                <option key={i + 1} value={i + 1}>{m}</option>
              ))}
            </select>
          </div>
          <button
            onClick={generate}
            disabled={loading}
            className="ml-auto px-4 py-1.5 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/90 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Generating…' : 'Generate review'}
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl bg-negative-dim border border-negative/20 p-4 text-sm text-negative">
          {error}
        </div>
      )}

      <AnimatePresence>
        {narrative && stats && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-4"
          >
            {/* Narrative */}
            <div
              className="rounded-2xl bg-surface border border-border p-6"
              style={{ boxShadow: 'var(--shadow-md)', borderColor: 'rgba(139,92,246,0.2)' }}
            >
              <p className="text-xs text-accent font-semibold uppercase tracking-widest mb-3">
                {periodName}
              </p>
              <p className="text-sm text-text leading-relaxed">{narrative}</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <Stat label="Days logged" value={String(stats.daysLogged)} />
              </div>
              <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <Stat label="Avg calories" value={stats.avgCalories.toLocaleString()} sub="kcal/day" />
              </div>
              <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <Stat label="Avg protein" value={`${stats.avgProtein}g`} sub="per day" />
              </div>
              <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <Stat label="Avg steps" value={stats.avgSteps.toLocaleString()} sub={`best: ${stats.maxSteps.toLocaleString()}`} />
              </div>
              <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                <Stat label="Avg hydration" value={`${stats.avgHydrationL}L`} sub="per day" />
              </div>
              {stats.weightChange !== null && (
                <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <Stat
                    label="Weight change"
                    value={`${stats.weightChange >= 0 ? '+' : ''}${stats.weightChange} kg`}
                    sub={`${stats.startWeight} → ${stats.endWeight} kg`}
                  />
                </div>
              )}
              {topMood && (
                <div className="rounded-2xl bg-surface border border-border p-4" style={{ boxShadow: 'var(--shadow-sm)' }}>
                  <Stat label="Top mood" value={topMood} sub={`${stats.moodCounts[topMood]} days`} />
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
