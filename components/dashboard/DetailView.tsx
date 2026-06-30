'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DailyStats, LogEntry } from '@/lib/db/queries'
import type { ParsedLog } from '@/lib/ai/types'
import { MetricAreaChart } from '@/components/ui/MetricAreaChart'

// ---- Helpers ----------------------------------------------------------------

function shortDate(iso: string) {
  return new Date(iso + 'T12:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') onEscape()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [onEscape])
}

// ---- Stat row ---------------------------------------------------------------

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-text tabular-nums">{value}</span>
    </div>
  )
}

// ---- Range toggle -----------------------------------------------------------

type Range = '7' | '30' | '180'

function RangeToggle({
  value,
  onChange,
}: {
  value: Range
  onChange: (r: Range) => void
}) {
  const options: { label: string; value: Range }[] = [
    { label: '1W', value: '7' },
    { label: '1M', value: '30' },
    { label: '6M', value: '180' },
  ]
  return (
    <div className="flex items-center gap-1 rounded-lg bg-surface-elevated p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
            value === o.value
              ? 'bg-accent text-white'
              : 'text-text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

// ---- Detail view shell ------------------------------------------------------

interface DetailShellProps {
  title: string
  onClose: () => void
  children: React.ReactNode
}

function DetailShell({ title, onClose, children }: DetailShellProps) {
  useEscapeKey(onClose)
  const scrollRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }}
      />

      {/* Panel */}
      <motion.div
        ref={scrollRef}
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border-strong)',
          boxShadow: 'var(--shadow-lg), 0 0 60px rgba(139,92,246,0.12)',
          maxHeight: '85dvh',
        }}
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-6">
          {children}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ---- Per-metric detail views ------------------------------------------------

interface MetricDetailProps {
  history: DailyStats[]
  onClose: () => void
  goalWeight?: number | null
  todayStats?: DailyStats | null
  logEntries?: LogEntry[]
}

function computeStats(values: number[]) {
  if (values.length === 0) return null
  const sum = values.reduce((a, b) => a + b, 0)
  const avg = sum / values.length
  const max = Math.max(...values)
  const min = Math.min(...values)
  const last7 = values.slice(-7)
  const avg7 = last7.reduce((a, b) => a + b, 0) / (last7.length || 1)
  return { avg, max, min, avg7, count: values.length }
}

// ---- Food breakdown ---------------------------------------------------------

function formatEntryTime(ts: string | undefined) {
  if (!ts) return ''
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
}

function FoodBreakdown({ logEntries }: { logEntries: LogEntry[] }) {
  const items = logEntries
    .filter((e) => {
      const p = e.parsed_json as ParsedLog | null
      return p && (p.calories || p.protein_g)
    })
    .slice()
    .reverse()

  if (items.length === 0) return null

  return (
    <div>
      <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Today&apos;s food log</p>
      <div className="flex flex-col divide-y divide-border">
        {items.map((entry, i) => {
          const p = entry.parsed_json as ParsedLog
          const ts = entry.logged_at ?? entry.created_at
          return (
            <div key={entry.id ?? i} className="flex items-start gap-2 py-2.5 first:pt-0">
              <div className="flex-1 min-w-0">
                <p className="text-sm text-text line-clamp-1">{entry.raw_text}</p>
                {ts && (
                  <p className="text-[10px] text-text-subtle mt-0.5">{formatEntryTime(ts)}</p>
                )}
              </div>
              <div className="shrink-0 flex flex-col items-end gap-0.5 tabular-nums">
                {p.calories ? (
                  <span className="text-xs text-text-muted">{p.calories} kcal</span>
                ) : null}
                {p.protein_g ? (
                  <span className="text-xs text-accent">{p.protein_g}g protein</span>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ---- What to eat button -----------------------------------------------------

function WhatToEat({ calories, protein_g }: { calories: number; protein_g: number }) {
  const [suggestion, setSuggestion] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const calRemaining = Math.max(0, 2000 - calories)
  const protRemaining = Math.max(0, 150 - protein_g)

  async function getSuggestion() {
    setLoading(true)
    try {
      const res = await fetch('/api/suggest-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ calories, protein_g }),
      })
      const data = await res.json()
      setSuggestion(data.suggestion)
    } catch {
      setSuggestion('Failed to get suggestions — try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest">Remaining today</p>
          <p className="text-sm text-text-muted mt-0.5">
            {calRemaining > 0 ? `${calRemaining} kcal` : 'calories hit ✓'}
            {' · '}
            {protRemaining > 0 ? `${protRemaining}g protein` : 'protein hit ✓'}
          </p>
        </div>
        <button
          onClick={getSuggestion}
          disabled={loading || (calRemaining < 50 && protRemaining < 10)}
          className="px-3 py-1.5 rounded-lg bg-accent/15 text-accent text-xs font-medium hover:bg-accent/25 disabled:opacity-40 transition-colors shrink-0"
        >
          {loading ? 'Thinking…' : 'What to eat?'}
        </button>
      </div>
      <AnimatePresence>
        {suggestion && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="rounded-xl bg-surface-elevated border border-border px-4 py-3"
          >
            <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Suggestions</p>
            <p className="text-sm text-text leading-relaxed whitespace-pre-line">{suggestion}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function NutritionDetail({ history, onClose, todayStats, logEntries }: MetricDetailProps) {
  const calData = history.map((d) => ({ date: shortDate(d.date), value: d.calories || null }))
  const protData = history.map((d) => ({ date: shortDate(d.date), value: d.protein_g || null }))
  const calVals = history.map((d) => d.calories).filter(Boolean) as number[]
  const protVals = history.map((d) => d.protein_g).filter(Boolean) as number[]
  const calStats = computeStats(calVals)
  const protStats = computeStats(protVals)

  return (
    <DetailShell title="Nutrition" onClose={onClose}>
      {todayStats && (
        <WhatToEat calories={todayStats.calories ?? 0} protein_g={todayStats.protein_g ?? 0} />
      )}
      {logEntries && logEntries.length > 0 && <FoodBreakdown logEntries={logEntries} />}
      <div>
        <p className="text-xs text-text-subtle uppercase tracking-widest mb-3">Calories</p>
        <MetricAreaChart data={calData} unit="kcal" height={140} />
      </div>
      {calStats && (
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Stats</p>
          <StatRow label="Daily average" value={`${Math.round(calStats.avg).toLocaleString()} kcal`} />
          <StatRow label="7-day average" value={`${Math.round(calStats.avg7).toLocaleString()} kcal`} />
          <StatRow label="Best day" value={`${calStats.max.toLocaleString()} kcal`} />
          <StatRow label="Days logged" value={String(calStats.count)} />
        </div>
      )}
      <div>
        <p className="text-xs text-text-subtle uppercase tracking-widest mb-3">Protein</p>
        <MetricAreaChart data={protData} unit="g" height={120} />
      </div>
      {protStats && (
        <div>
          <StatRow label="Daily average" value={`${Math.round(protStats.avg)}g`} />
          <StatRow label="Best day" value={`${protStats.max}g`} />
        </div>
      )}
    </DetailShell>
  )
}

export function StepsDetail({ history, onClose }: MetricDetailProps) {
  const data = history.map((d) => ({ date: shortDate(d.date), value: d.steps || null }))
  const vals = history.map((d) => d.steps).filter(Boolean) as number[]
  const stats = computeStats(vals)

  return (
    <DetailShell title="Steps" onClose={onClose}>
      <MetricAreaChart data={data} height={160} />
      {stats && (
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Stats</p>
          <StatRow label="Daily average" value={`${Math.round(stats.avg).toLocaleString()}`} />
          <StatRow label="7-day average" value={`${Math.round(stats.avg7).toLocaleString()}`} />
          <StatRow label="Best day" value={stats.max.toLocaleString()} />
          <StatRow label="Days logged" value={String(stats.count)} />
          <StatRow label="Days ≥ 10k" value={String(vals.filter((v) => v >= 10000).length)} />
        </div>
      )}
    </DetailShell>
  )
}

export function SleepDetail({ history, onClose }: MetricDetailProps) {
  const data = history.map((d) => ({ date: shortDate(d.date), value: d.sleep_hours }))
  const vals = history.map((d) => d.sleep_hours).filter((v): v is number => v !== null)
  const stats = computeStats(vals)

  return (
    <DetailShell title="Sleep" onClose={onClose}>
      <MetricAreaChart
        data={data}
        height={160}
        unit="hrs"
        formatValue={(v) => v.toFixed(1)}
      />
      {stats && (
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Stats</p>
          <StatRow label="Average" value={`${stats.avg.toFixed(1)} hrs`} />
          <StatRow label="Best" value={`${stats.max.toFixed(1)} hrs`} />
          <StatRow label="Worst" value={`${stats.min.toFixed(1)} hrs`} />
          <StatRow label="Days ≥ 8h" value={String(vals.filter((v) => v >= 8).length)} />
          <StatRow label="Days logged" value={String(stats.count)} />
        </div>
      )}
    </DetailShell>
  )
}

export function HydrationDetail({ history, onClose }: MetricDetailProps) {
  const data = history.map((d) => ({
    date: shortDate(d.date),
    value: d.water_ml ? d.water_ml / 1000 : null,
  }))
  const vals = history.map((d) => d.water_ml / 1000).filter((v) => v > 0)
  const stats = computeStats(vals)

  return (
    <DetailShell title="Hydration" onClose={onClose}>
      <MetricAreaChart
        data={data}
        height={160}
        unit="L"
        formatValue={(v) => v.toFixed(1)}
      />
      {stats && (
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Stats</p>
          <StatRow label="Daily average" value={`${stats.avg.toFixed(1)} L`} />
          <StatRow label="Best day" value={`${stats.max.toFixed(1)} L`} />
          <StatRow label="Days ≥ 2L" value={String(vals.filter((v) => v >= 2).length)} />
          <StatRow label="Days logged" value={String(stats.count)} />
        </div>
      )}
    </DetailShell>
  )
}

// ---- Linear regression for weight projection --------------------------------

function linearProjection(vals: { x: number; y: number }[]) {
  if (vals.length < 3) return null
  const n = vals.length
  const sumX = vals.reduce((s, p) => s + p.x, 0)
  const sumY = vals.reduce((s, p) => s + p.y, 0)
  const sumXY = vals.reduce((s, p) => s + p.x * p.y, 0)
  const sumX2 = vals.reduce((s, p) => s + p.x * p.x, 0)
  const denom = n * sumX2 - sumX * sumX
  if (Math.abs(denom) < 1e-10) return null
  const slope = (n * sumXY - sumX * sumY) / denom
  const intercept = (sumY - slope * sumX) / n
  return { slope, intercept }
}

interface WeightDetailProps extends MetricDetailProps {
  goalWeight?: number | null
}

export function WeightDetail({ history, onClose, goalWeight: initialGoal }: WeightDetailProps) {
  const [range, setRange] = useState<Range>('30')
  const [goalInput, setGoalInput] = useState(initialGoal?.toString() ?? '')
  const [goal, setGoal] = useState<number | null>(initialGoal ?? null)

  // Save goal to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('parma-weight-goal')
    if (saved && !initialGoal) {
      setGoal(parseFloat(saved))
      setGoalInput(saved)
    }
  }, [initialGoal])

  function applyGoal() {
    const v = parseFloat(goalInput)
    if (!isNaN(v) && v > 0) {
      setGoal(v)
      localStorage.setItem('parma-weight-goal', String(v))
    }
  }

  const days = range === '7' ? 7 : range === '30' ? 30 : 180
  const slice = history.slice(-days)

  const data = slice.map((d) => ({ date: shortDate(d.date), value: d.weight_kg }))
  const vals = slice.map((d) => d.weight_kg).filter((v): v is number => v !== null)
  const stats = computeStats(vals)

  // Projection
  const indexedVals = slice
    .map((d, i) => ({ x: i, y: d.weight_kg }))
    .filter((p): p is { x: number; y: number } => p.y !== null)

  const reg = linearProjection(indexedVals)
  let projectionDays: number | null = null
  let projectionDate: string | null = null
  let projectionNote: string | null = null

  if (goal !== null) {
    if (vals.length < 3) {
      projectionNote = 'Log at least 3 days of weight to see a projection'
    } else if (reg) {
      const lastY = indexedVals[indexedVals.length - 1]?.y ?? 0
      const nearGoal = Math.abs(goal - lastY) < 0.2
      if (nearGoal) {
        projectionNote = 'You\'re essentially at your goal weight'
      } else if (Math.abs(reg.slope) < 0.001) {
        projectionNote = 'No clear trend yet — keep logging'
      } else {
        const daysToGoal = (goal - lastY) / reg.slope
        if (daysToGoal <= 0) {
          projectionNote = 'Current trend is moving away from your goal'
        } else if (daysToGoal >= 730) {
          projectionNote = 'At this pace it would take over 2 years'
        } else {
          projectionDays = Math.round(daysToGoal)
          const d = new Date()
          d.setDate(d.getDate() + projectionDays)
          projectionDate = d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        }
      }
    }
  }

  return (
    <DetailShell title="Weight" onClose={onClose}>
      <div className="flex items-center justify-between">
        <RangeToggle value={range} onChange={setRange} />
      </div>

      <MetricAreaChart
        data={data}
        height={160}
        unit="kg"
        formatValue={(v) => v.toFixed(1)}
        referenceLine={goal ?? undefined}
        referenceLabel={goal ? `Goal: ${goal} kg` : undefined}
      />

      {/* Goal setter */}
      <div className="flex items-center gap-2">
        <input
          type="number"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          onBlur={applyGoal}
          onKeyDown={(e) => e.key === 'Enter' && applyGoal()}
          placeholder="Set goal weight (kg)"
          step="0.1"
          className="flex-1 rounded-lg bg-surface-elevated border border-border text-text text-sm px-3 py-2 focus:outline-none focus:border-accent placeholder:text-text-subtle"
        />
        <button
          onClick={applyGoal}
          className="px-3 py-2 rounded-lg bg-accent/15 text-accent text-sm font-medium hover:bg-accent/25 transition-colors"
        >
          Set
        </button>
      </div>

      {/* Projection */}
      {projectionDate && reg && (
        <div className="rounded-xl bg-accent-dim border border-accent/20 px-4 py-3">
          <p className="text-xs text-text-subtle mb-0.5">At current trajectory</p>
          <p className="text-sm font-semibold text-text">
            Reach {goal} kg by <span className="text-accent">{projectionDate}</span>
          </p>
          <p className="text-xs text-text-subtle mt-0.5">
            ~{Math.abs(reg.slope).toFixed(2)} kg/day · {projectionDays} days away
          </p>
        </div>
      )}
      {projectionNote && (
        <div className="rounded-xl bg-surface-elevated border border-border px-4 py-3">
          <p className="text-xs text-text-subtle">{projectionNote}</p>
        </div>
      )}

      {stats && (
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Stats</p>
          <StatRow label="Average" value={`${stats.avg.toFixed(1)} kg`} />
          <StatRow label="High" value={`${stats.max.toFixed(1)} kg`} />
          <StatRow label="Low" value={`${stats.min.toFixed(1)} kg`} />
          {vals.length >= 2 && (
            <StatRow
              label="Change"
              value={`${vals[vals.length - 1] - vals[0] >= 0 ? '+' : ''}${(vals[vals.length - 1] - vals[0]).toFixed(1)} kg`}
            />
          )}
          {goal !== null && stats && (
            <StatRow label="To goal" value={`${(stats.avg - goal).toFixed(1)} kg`} />
          )}
          <StatRow label="Days logged" value={String(stats.count)} />
        </div>
      )}
    </DetailShell>
  )
}

const MOOD_ORDER = ['great', 'good', 'okay', 'low', 'bad']
const MOOD_SCORE: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, bad: 1 }
const MOOD_LABEL: Record<string, string> = { great: '🔥 Great', good: '😊 Good', okay: '😐 Okay', low: '😕 Low', bad: '😞 Bad' }

export function MoodDetail({ history, onClose }: MetricDetailProps) {
  const moodData = history.map((d) => ({
    date: shortDate(d.date),
    value: d.mood ? MOOD_SCORE[d.mood] ?? null : null,
  }))
  const moods = history.map((d) => d.mood).filter((m): m is string => !!m)
  const tally: Record<string, number> = {}
  for (const m of moods) tally[m] = (tally[m] ?? 0) + 1
  const topMood = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]

  return (
    <DetailShell title="Mood" onClose={onClose}>
      <MetricAreaChart
        data={moodData}
        height={140}
        formatValue={(v) => ['', 'Bad', 'Low', 'Okay', 'Good', 'Great'][Math.round(v)] ?? ''}
      />
      {moods.length > 0 && (
        <div>
          <p className="text-xs text-text-subtle uppercase tracking-widest mb-2">Breakdown</p>
          {MOOD_ORDER.filter((m) => tally[m]).map((m) => (
            <div key={m} className="flex items-center gap-2 py-1.5">
              <div className="flex-1 h-1.5 rounded-full bg-surface-elevated overflow-hidden">
                <div
                  className="h-full rounded-full bg-accent"
                  style={{ width: `${((tally[m] ?? 0) / moods.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-text-muted w-20">{MOOD_LABEL[m]}</span>
              <span className="text-xs text-text-subtle tabular-nums w-6 text-right">
                {tally[m]}
              </span>
            </div>
          ))}
          {topMood && (
            <p className="text-xs text-text-subtle mt-3">
              Most common: <span className="text-text">{MOOD_LABEL[topMood[0]]}</span>
            </p>
          )}
        </div>
      )}
    </DetailShell>
  )
}

// ---- Export types so DashboardGrid can import --------------------------------

export type MetricId =
  | 'nutrition'
  | 'steps'
  | 'sleep'
  | 'hydration'
  | 'weight'
  | 'mood'

export interface DetailViewProps {
  metric: MetricId | null
  history: DailyStats[]
  onClose: () => void
  weightGoal?: number | null
  todayStats?: DailyStats | null
  logEntries?: LogEntry[]
}

export function DetailViewRouter({ metric, history, onClose, weightGoal, todayStats, logEntries }: DetailViewProps) {
  return (
    <AnimatePresence>
      {metric === 'nutrition' && <NutritionDetail key="nutrition" history={history} onClose={onClose} todayStats={todayStats} logEntries={logEntries} />}
      {metric === 'steps' && <StepsDetail key="steps" history={history} onClose={onClose} />}
      {metric === 'sleep' && <SleepDetail key="sleep" history={history} onClose={onClose} />}
      {metric === 'hydration' && <HydrationDetail key="hydration" history={history} onClose={onClose} />}
      {metric === 'weight' && <WeightDetail key="weight" history={history} onClose={onClose} goalWeight={weightGoal} />}
      {metric === 'mood' && <MoodDetail key="mood" history={history} onClose={onClose} />}
    </AnimatePresence>
  )
}
