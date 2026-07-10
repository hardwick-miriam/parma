'use client'

import { useEffect, useRef, useState, useCallback, lazy, Suspense } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MetricAreaChart } from '@/components/ui/MetricAreaChart'
import { getLocalDate } from '@/lib/date'
import type { DailyStats, WorkoutSession, InjuryWithCheckins } from '@/lib/db/queries'
import type { WeatherData } from './widgets/WeatherWidget'
import type { WhoopMetrics } from '@/lib/db/whoop'
import type { StreakData } from '@/lib/streaks'

const GlobeGL = lazy(() => import('./GlobeGL'))

// ─── Shell ────────────────────────────────────────────────────────────────────

function useEscapeKey(fn: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') fn() }
    document.addEventListener('keydown', h)
    return () => document.removeEventListener('keydown', h)
  }, [fn])
}

function WidgetShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  useEscapeKey(onClose)
  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(6px)' }} />
      <motion.div
        className="relative w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-lg)', maxHeight: '85dvh' }}
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }} transition={{ duration: 0.3, ease: 'easeOut' }}
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border shrink-0">
          <h2 className="text-base font-semibold text-text">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-surface-elevated flex items-center justify-center text-text-muted hover:text-text text-lg leading-none">×</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 flex flex-col gap-5">{children}</div>
      </motion.div>
    </motion.div>
  )
}

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-muted">{label}</span>
      <span className="text-sm font-semibold text-text tabular-nums">{value}</span>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-text-subtle uppercase tracking-widest mb-1">{children}</p>
}

// ─── Individual detail views ──────────────────────────────────────────────────

export function WorkoutsDetail({ workouts, history, onClose }: { workouts: WorkoutSession[]; history: DailyStats[]; onClose: () => void }) {
  const shortDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const workoutData = history.slice(-30).map((d) => ({
    date: shortDate(d.date),
    value: (d as DailyStats & { workouts_count?: number }).workouts_count ?? null,
  }))
  const totalDuration = workouts.reduce((s, w) => s + (w.duration_minutes ?? 0), 0)

  return (
    <WidgetShell title="Workouts" onClose={onClose}>
      <div>
        <SectionLabel>Today</SectionLabel>
        {workouts.length === 0 ? (
          <p className="text-sm text-text-subtle">No workouts logged today</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {workouts.map((w, i) => (
              <div key={w.id ?? i} className="py-3 first:pt-0 last:pb-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-text line-clamp-2">{w.description}</p>
                  {w.duration_minutes && <span className="text-xs text-text-subtle shrink-0">{w.duration_minutes}m</span>}
                </div>
                {w.feeling && <p className="text-xs text-text-muted mt-0.5">Feeling: {w.feeling}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <SectionLabel>Stats (today)</SectionLabel>
        <StatRow label="Sessions" value={String(workouts.length)} />
        <StatRow label="Total duration" value={totalDuration > 0 ? `${totalDuration} min` : '—'} />
      </div>
    </WidgetShell>
  )
}

export function WhoopDetail({ whoopHistory, onClose }: { whoopHistory: WhoopMetrics[]; onClose: () => void }) {
  const shortDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const slice = whoopHistory.slice(-30)

  const recovData = slice.map((d) => ({ date: shortDate(d.date), value: d.recovery_score ?? null }))
  const hrvData = slice.map((d) => ({ date: shortDate(d.date), value: d.hrv_rmssd_milli ?? null }))
  const strainData = slice.map((d) => ({ date: shortDate(d.date), value: d.strain ?? null }))
  const rhrData = slice.map((d) => ({ date: shortDate(d.date), value: d.resting_hr ?? null }))

  const latest = slice[slice.length - 1]

  return (
    <WidgetShell title="WHOOP" onClose={onClose}>
      {latest && (
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Recovery', value: latest.recovery_score != null ? `${latest.recovery_score}%` : '—' },
            { label: 'HRV', value: latest.hrv_rmssd_milli != null ? `${Math.round(latest.hrv_rmssd_milli)} ms` : '—' },
            { label: 'Strain', value: latest.strain != null ? latest.strain.toFixed(1) : '—' },
            { label: 'Resting HR', value: latest.resting_hr != null ? `${latest.resting_hr} bpm` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl bg-surface-elevated border border-border p-3">
              <p className="text-xs text-text-subtle">{label}</p>
              <p className="text-xl font-bold text-text tabular-nums mt-0.5">{value}</p>
            </div>
          ))}
        </div>
      )}
      {recovData.some((d) => d.value != null) && (
        <div>
          <SectionLabel>Recovery score (30 days)</SectionLabel>
          <MetricAreaChart data={recovData} unit="%" height={110} />
        </div>
      )}
      {hrvData.some((d) => d.value != null) && (
        <div>
          <SectionLabel>HRV (ms)</SectionLabel>
          <MetricAreaChart data={hrvData} unit=" ms" height={100} />
        </div>
      )}
      {strainData.some((d) => d.value != null) && (
        <div>
          <SectionLabel>Strain</SectionLabel>
          <MetricAreaChart data={strainData} height={100} />
        </div>
      )}
      {rhrData.some((d) => d.value != null) && (
        <div>
          <SectionLabel>Resting HR (bpm)</SectionLabel>
          <MetricAreaChart data={rhrData} unit=" bpm" height={100} />
        </div>
      )}
      {whoopHistory.length === 0 && (
        <p className="text-sm text-text-subtle">Connect WHOOP in Settings to see trends.</p>
      )}
    </WidgetShell>
  )
}

export function SleepDebtDetail({ history, target = 8, onClose }: { history: DailyStats[]; target?: number; onClose: () => void }) {
  const toKey = (d: Date) => getLocalDate(undefined, d)
  const last30 = Array.from({ length: 30 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (29 - i))
    return toKey(d)
  })
  const byDate = new Map(history.map((d) => [d.date, d]))
  const shortDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const rows = last30.map((date) => {
    const row = byDate.get(date)
    const hrs = row?.sleep_hours ?? null
    const deficit = hrs != null ? Math.max(0, target - hrs) : null
    return { date, hrs, deficit }
  })

  const debtData = rows.map((r) => ({ date: shortDate(r.date), value: r.deficit }))
  const totalDebt = rows.reduce((s, r) => s + (r.deficit ?? 0), 0)
  const daysLogged = rows.filter((r) => r.hrs != null).length
  const daysOnTarget = rows.filter((r) => r.hrs != null && (r.deficit ?? 1) <= 0).length

  return (
    <WidgetShell title="Sleep Debt" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Total debt', value: `${totalDebt.toFixed(1)}h` },
          { label: 'Days logged', value: String(daysLogged) },
          { label: 'On target', value: `${daysLogged > 0 ? Math.round((daysOnTarget / daysLogged) * 100) : 0}%` },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface-elevated border border-border p-3 text-center">
            <p className="text-[10px] text-text-subtle truncate">{label}</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>Deficit per night (30 days)</SectionLabel>
        <MetricAreaChart data={debtData} unit="h" height={120} formatValue={(v) => v.toFixed(1)} />
      </div>

      <div>
        <SectionLabel>Per-night breakdown (last 14)</SectionLabel>
        <div className="flex flex-col divide-y divide-border">
          {rows.slice(-14).reverse().map(({ date, hrs, deficit }) => (
            <div key={date} className="flex items-center justify-between py-2">
              <span className="text-xs text-text-muted">{shortDate(date)}</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-text tabular-nums">{hrs != null ? `${hrs.toFixed(1)}h` : '—'}</span>
                {deficit != null && deficit > 0 && (
                  <span className="text-[10px] text-red-400">-{deficit.toFixed(1)}h</span>
                )}
                {deficit != null && deficit <= 0 && (
                  <span className="text-[10px] text-emerald-400">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </WidgetShell>
  )
}

export function InsightsDetail({ onClose }: { onClose: () => void }) {
  // Field names match the real /api/insights response (see InsightRow in
  // InsightsWidget.tsx: title/body/strength/type) — the previous
  // metric_a/metric_b/r/interpretation fields never existed on any
  // response this API produces, so every insight here silently rendered
  // blank even when the fetch succeeded.
  const [data, setData] = useState<{ insights: Array<{ type: string; title: string; body: string; strength?: number | null }>; insufficient?: boolean } | null>(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    fetch('/api/insights').then((r) => r.json()).then(setData).catch(() => setError(true))
  }, [])

  return (
    <WidgetShell title="Insights" onClose={onClose}>
      {!data && !error && <p className="text-sm text-text-subtle">Loading insights…</p>}
      {error && <p className="text-sm text-text-subtle">Couldn&apos;t load insights — try again shortly.</p>}
      {data?.insights?.map((ins, i) => (
        <div key={i} className="rounded-xl bg-surface-elevated border border-border p-4 flex flex-col gap-1">
          <p className="text-xs text-text-subtle uppercase tracking-widest">{ins.title}</p>
          <p className="text-sm text-text">{ins.body}</p>
        </div>
      ))}
      {data && !error && data.insights?.length === 0 && (
        <p className="text-sm text-text-subtle">
          {data.insufficient ? 'Log at least 10 days of data to see insights.' : 'Log more days to unlock correlations.'}
        </p>
      )}
    </WidgetShell>
  )
}

export function HabitGardenDetail({ streaks, onClose }: { streaks: StreakData; onClose: () => void }) {
  const items = [
    { label: 'Logging streak', days: streaks.logging },
    { label: 'Protein goal streak', days: streaks.protein },
    { label: 'Workout streak', days: streaks.workouts },
    { label: 'Hydration streak', days: streaks.hydration },
    { label: 'Steps streak', days: streaks.steps },
  ].filter((x) => x.days != null && x.days > 0)

  return (
    <WidgetShell title="Habit Garden" onClose={onClose}>
      <div>
        <SectionLabel>Active streaks</SectionLabel>
        {items.length === 0 ? (
          <p className="text-sm text-text-subtle">Log your first habits to grow the garden.</p>
        ) : (
          items.map(({ label, days }) => (
            <div key={label} className="flex items-center gap-3 py-2 border-b border-border last:border-0">
              <div className="flex-1">
                <p className="text-sm text-text">{label}</p>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-base font-bold text-text tabular-nums">{days}</span>
                <span className="text-xs text-text-muted">days</span>
                {(days ?? 0) >= 7 && <span className="text-base">🌳</span>}
                {(days ?? 0) >= 3 && (days ?? 0) < 7 && <span className="text-base">🌿</span>}
                {(days ?? 0) < 3 && <span className="text-base">🌱</span>}
              </div>
            </div>
          ))
        )}
      </div>
      <div className="rounded-xl bg-surface-elevated border border-border p-4">
        <p className="text-xs text-text-subtle mb-1">How it grows</p>
        <p className="text-sm text-text">The plant grows taller and fuller as you log consistently. Reach 7-day streaks to unlock new growth stages.</p>
      </div>
    </WidgetShell>
  )
}

export function HeatmapDetail({ history, onClose }: { history: DailyStats[]; onClose: () => void }) {
  const shortDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const logData = history.slice(-30).map((d) => ({
    date: shortDate(d.date),
    value: (d.calories ?? 0) > 0 || (d.steps ?? 0) > 0 ? 1 : 0,
  }))
  const logged = history.filter((d) => (d.calories ?? 0) > 0 || (d.steps ?? 0) > 0).length
  const streak = logged

  return (
    <WidgetShell title="Year Heatmap" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Days logged', value: String(logged) },
          { label: 'of last 365', value: `${Math.round((logged / 365) * 100)}%` },
          { label: 'Data points', value: String(history.length) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface-elevated border border-border p-3 text-center">
            <p className="text-[10px] text-text-subtle">{label}</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>Daily activity (30 days)</SectionLabel>
        <MetricAreaChart data={logData} height={100} />
      </div>

      <div>
        <SectionLabel>Switch metrics</SectionLabel>
        <p className="text-xs text-text-subtle">Use the year heatmap widget to switch between Logging, Workouts, Calories, Steps, Sleep, and Mood views.</p>
      </div>
    </WidgetShell>
  )
}

export function GlobeDetail({ visitedCountries: initialVisited = [], onClose }: { visitedCountries?: string[]; onClose: () => void }) {
  const [countryNames, setCountryNames] = useState<Array<{ ISO_A3: string; ADMIN: string }>>([])
  const [visitedCountries, setVisitedCountries] = useState<string[]>(initialVisited)

  useEffect(() => {
    if (initialVisited.length === 0) {
      fetch('/api/countries').then((r) => r.json()).then((d: { countries?: string[] }) => {
        if (d.countries) setVisitedCountries(d.countries)
      }).catch(() => {})
    }
    fetch('/geo/world.geojson')
      .then((r) => r.json())
      .then((d: { features: Array<{ properties: { ISO_A3: string; ADMIN: string } }> }) =>
        setCountryNames(d.features.map((f) => f.properties))
      )
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleToggle = useCallback((isoA3: string, nowVisited: boolean) => {
    setVisitedCountries((prev) =>
      nowVisited ? [...prev.filter((c) => c !== isoA3), isoA3] : prev.filter((c) => c !== isoA3)
    )
    if (nowVisited) {
      fetch('/api/countries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ codes: [isoA3] }) })
        .catch(() => setVisitedCountries((prev) => prev.filter((c) => c !== isoA3)))
    } else {
      fetch(`/api/countries?code=${isoA3}`, { method: 'DELETE' })
        .catch(() => setVisitedCountries((prev) => [...prev, isoA3]))
    }
  }, [])

  const visited = visitedCountries.map((iso) => {
    const match = countryNames.find((c) => c.ISO_A3 === iso)
    return { iso, name: match?.ADMIN ?? iso }
  }).sort((a, b) => a.name.localeCompare(b.name))

  const pct = ((visitedCountries.length / 177) * 100).toFixed(1)

  return (
    <WidgetShell title="World" onClose={onClose}>
      {/* Themed interactive globe */}
      <div className="relative rounded-2xl overflow-hidden" style={{ height: 260 }}>
        <Suspense fallback={<div className="flex items-center justify-center h-full text-xs text-text-muted">Loading globe…</div>}>
          <GlobeGL visitedCountries={visitedCountries} compact={false} onToggle={handleToggle} />
        </Suspense>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Countries', value: String(visitedCountries.length) },
          { label: 'of 177', value: `${pct}%` },
          { label: 'To go', value: String(177 - visitedCountries.length) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface-elevated border border-border p-3 text-center">
            <p className="text-[10px] text-text-subtle">{label}</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>Visited ({visited.length})</SectionLabel>
        {visited.length === 0 ? (
          <p className="text-sm text-text-subtle">Tap a country on the globe to mark it visited.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {visited.map(({ iso, name }) => (
              <span key={iso} className="text-xs px-2 py-0.5 rounded-full bg-surface-elevated border border-border text-text-muted">{name}</span>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}

export function PRTrackerDetail({ onClose }: { onClose: () => void }) {
  // Matches the real /api/personal-records / personal_records shape (see
  // PRTrackerWidget.tsx) — the previous max_weight_kg/max_reps/logged_date
  // fields never existed on the API response, so every PR here silently
  // rendered with no value/reps/date at all.
  const [prs, setPrs] = useState<Array<{ id: string; exercise: string; value: number; unit: string; reps: number | null; logged_at: string }>>([])

  useEffect(() => {
    fetch('/api/personal-records').then((r) => r.json()).then((d) => { if (d.records) setPrs(d.records) }).catch(() => {})
  }, [])

  return (
    <WidgetShell title="Personal Records" onClose={onClose}>
      <div>
        <SectionLabel>All-time PRs ({prs.length})</SectionLabel>
        {prs.length === 0 ? (
          <p className="text-sm text-text-subtle">Log strength workouts to track PRs.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">
            {prs.map((pr) => (
              <div key={pr.id} className="flex items-center justify-between py-2.5">
                <span className="text-sm text-text capitalize">{pr.exercise.replace(/_/g, ' ')}</span>
                <div className="text-right">
                  <p className="text-sm font-semibold text-text tabular-nums">
                    {Number.isInteger(pr.value) ? pr.value : pr.value.toFixed(1)} {pr.unit}
                  </p>
                  {pr.reps != null && (
                    <p className="text-xs text-text-subtle">{pr.reps} reps</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </WidgetShell>
  )
}

export function TrainingLoadDetail({ recentWorkouts, onClose }: { recentWorkouts: WorkoutSession[]; onClose: () => void }) {
  const shortDate = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  // Build weekly volume over last 4 weeks
  const toKey = (d: Date) => getLocalDate(undefined, d)
  const last28 = Array.from({ length: 28 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (27 - i))
    return toKey(d)
  })

  const byDate = new Map<string, number>()
  for (const w of recentWorkouts) {
    byDate.set(w.date, (byDate.get(w.date) ?? 0) + (w.duration_minutes ?? 30))
  }

  const chartData = last28.map((date) => ({
    date: shortDate(date),
    value: byDate.get(date) ?? 0,
  }))

  const totalSessions = recentWorkouts.length
  const totalMins = recentWorkouts.reduce((s, w) => s + (w.duration_minutes ?? 30), 0)
  const avgPerWeek = totalSessions / 4

  return (
    <WidgetShell title="Training Load" onClose={onClose}>
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Sessions (28d)', value: String(totalSessions) },
          { label: 'Volume (min)', value: String(totalMins) },
          { label: 'Per week avg', value: avgPerWeek.toFixed(1) },
        ].map(({ label, value }) => (
          <div key={label} className="rounded-xl bg-surface-elevated border border-border p-3 text-center">
            <p className="text-[10px] text-text-subtle">{label}</p>
            <p className="text-lg font-bold text-text tabular-nums mt-0.5">{value}</p>
          </div>
        ))}
      </div>

      <div>
        <SectionLabel>Daily volume (28 days, minutes)</SectionLabel>
        <MetricAreaChart data={chartData} unit=" min" height={120} />
      </div>

      <div>
        <SectionLabel>Recent sessions</SectionLabel>
        {recentWorkouts.slice(-10).reverse().map((w, i) => (
          <div key={i} className="flex items-start justify-between py-2 border-b border-border last:border-0">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-muted">{shortDate(w.date)}</p>
              <p className="text-sm text-text line-clamp-1">{w.description}</p>
            </div>
            {w.duration_minutes && <span className="text-xs text-text-subtle shrink-0 ml-2">{w.duration_minutes}m</span>}
          </div>
        ))}
      </div>
    </WidgetShell>
  )
}

export function BodyDetail({ injuries, onClose }: { injuries: InjuryWithCheckins[]; onClose: () => void }) {
  return (
    <WidgetShell title="Body" onClose={onClose}>
      <div>
        <SectionLabel>Active injuries ({injuries.length})</SectionLabel>
        {injuries.length === 0 ? (
          <p className="text-sm text-text-subtle">No active injuries. Tap muscle groups on the body figure to see load details.</p>
        ) : (
          injuries.map((inj) => (
            <div key={inj.id} className="rounded-xl bg-surface-elevated border border-border p-3 flex flex-col gap-1 mb-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-text">{inj.body_part ?? 'Unknown area'}</p>
                {inj.checkins.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                    {inj.checkins.at(-1)?.feeling_pct ?? '?'}% recovered
                  </span>
                )}
              </div>
              <p className="text-xs text-text-muted">{inj.description}</p>
            </div>
          ))
        )}
      </div>
      <div className="rounded-xl bg-surface-elevated border border-border p-3">
        <p className="text-xs text-text-subtle">Tap muscle groups on the body figure to see workout load and recovery time for each muscle.</p>
      </div>
    </WidgetShell>
  )
}

export function WeatherDetail({ weather, onClose }: { weather: WeatherData | null; onClose: () => void }) {
  // Reuses the WeatherData the WeatherWidget already fetched (it has the
  // user's geolocated lat/lon; this sheet has no way to get those itself)
  // instead of re-fetching /api/weather with no coordinates, which used to
  // 400 and render a silent blank sheet. Field names also now match the
  // real WeatherData shape (description/feelsLike/windKph) — the old ones
  // (conditions/feels_like/wind_speed) never existed on any response this
  // app produces.
  return (
    <WidgetShell title="Weather" onClose={onClose}>
      {!weather ? (
        <p className="text-sm text-text-subtle">Weather isn&apos;t available yet — open the Weather widget on your dashboard first.</p>
      ) : (
        <>
          {weather.location && <p className="text-sm text-text-muted">{weather.location}</p>}
          <div className="grid grid-cols-2 gap-2">
            <StatRow label="Temperature" value={`${weather.temp}°C`} />
            <StatRow label="Feels like" value={`${weather.feelsLike}°C`} />
            <StatRow label="Humidity" value={`${weather.humidity}%`} />
            {weather.windKph > 0 && <StatRow label="Wind" value={`${weather.windKph} km/h`} />}
          </div>
          {weather.description && <p className="text-sm text-text capitalize">{weather.emoji} {weather.description}</p>}
        </>
      )}
    </WidgetShell>
  )
}

// ─── Generic stub for widgets with internal data ──────────────────────────────

export function GenericDetail({ title, message, onClose }: { title: string; message?: string; onClose: () => void }) {
  return (
    <WidgetShell title={title} onClose={onClose}>
      <p className="text-sm text-text-subtle">{message ?? 'Tap the widget to interact with it directly.'}</p>
    </WidgetShell>
  )
}

// ─── Router ───────────────────────────────────────────────────────────────────

export type WidgetId =
  | 'work' | 'weather' | 'hab' | 'media' | 'supp' | 'photos' | 'journal'
  | 'map' | 'clocks' | 'whoop' | 'insights' | 'body' | 'prtracker'
  | 'trainload' | 'sleepdebt' | 'habitgarden' | 'heatmap'

interface WidgetDetailRouterProps {
  widget: WidgetId | null
  onClose: () => void
  // Data
  workouts?: WorkoutSession[]
  recentWorkouts?: WorkoutSession[]
  history?: DailyStats[]
  whoopHistory?: WhoopMetrics[]
  streaks?: StreakData
  injuries?: InjuryWithCheckins[]
  visitedCountries?: string[]
  weather?: WeatherData | null
}

export function WidgetDetailRouter({
  widget, onClose,
  workouts = [], recentWorkouts = [], history = [],
  whoopHistory = [], streaks, injuries = [], visitedCountries = [],
  weather = null,
}: WidgetDetailRouterProps) {
  const defaultStreaks: StreakData = streaks ?? { logging: 0, protein: 0, workouts: 0, hydration: 0, steps: 0 }

  return (
    <AnimatePresence>
      {widget === 'work'       && <WorkoutsDetail    key="work"       workouts={workouts} history={history} onClose={onClose} />}
      {widget === 'weather'    && <WeatherDetail      key="weather"    weather={weather} onClose={onClose} />}
      {widget === 'whoop'      && <WhoopDetail        key="whoop"      whoopHistory={whoopHistory} onClose={onClose} />}
      {widget === 'insights'   && <InsightsDetail     key="insights"   onClose={onClose} />}
      {widget === 'body'       && <BodyDetail         key="body"       injuries={injuries} onClose={onClose} />}
      {widget === 'prtracker'  && <PRTrackerDetail    key="prtracker"  onClose={onClose} />}
      {widget === 'trainload'  && <TrainingLoadDetail key="trainload"  recentWorkouts={recentWorkouts} onClose={onClose} />}
      {widget === 'sleepdebt'  && <SleepDebtDetail    key="sleepdebt"  history={history} onClose={onClose} />}
      {widget === 'habitgarden'&& <HabitGardenDetail  key="habitgarden" streaks={defaultStreaks} onClose={onClose} />}
      {widget === 'heatmap'    && <HeatmapDetail      key="heatmap"    history={history} onClose={onClose} />}
      {widget === 'map'        && <GlobeDetail        key="map"        visitedCountries={visitedCountries} onClose={onClose} />}
      {widget === 'hab'        && <GenericDetail key="hab"     title="Habits"       message="Mark habits complete using the checkboxes in the widget."   onClose={onClose} />}
      {widget === 'media'      && <GenericDetail key="media"   title="Media"        message="Add books, films, shows and songs via the log input."        onClose={onClose} />}
      {widget === 'supp'       && <GenericDetail key="supp"    title="Supplements"  message="Check off supplements directly in the widget each day."     onClose={onClose} />}
      {widget === 'photos'     && <GenericDetail key="photos"  title="Photos"       message="Progress photos are shown in the widget. Add via the log."  onClose={onClose} />}
      {widget === 'journal'    && <GenericDetail key="journal" title="Journal"      message="Your daily notes appear here. Add via the log input."       onClose={onClose} />}
      {widget === 'clocks'     && <GenericDetail key="clocks"  title="World Clocks" message="Tap + Add city in the World Clocks widget to add a city."   onClose={onClose} />}
    </AnimatePresence>
  )
}
