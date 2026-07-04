'use client'

import 'react-grid-layout/css/styles.css'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Responsive, WidthProvider } from 'react-grid-layout/legacy'
import type { LayoutItem, ResponsiveLayouts } from 'react-grid-layout/legacy'
import { motion, AnimatePresence } from 'framer-motion'
import { NutritionWidget } from './widgets/NutritionWidget'
import { StepsWidget } from './widgets/StepsWidget'
import { WorkoutsWidget } from './widgets/WorkoutsWidget'
import { MoodWidget } from './widgets/MoodWidget'
import { SleepWidget } from './widgets/SleepWidget'
import { HydrationWidget } from './widgets/HydrationWidget'
import { WeightWidget } from './widgets/WeightWidget'
import { SupplementsWidget } from './widgets/SupplementsWidget'
import { HabitsWidget } from './widgets/HabitsWidget'
import { HealthStatusWidget } from './widgets/HealthStatusWidget'
import { TimelineWidget } from './widgets/TimelineWidget'
import { InjuryWidget } from './widgets/InjuryWidget'
import { MounjaroWidget } from './widgets/MounjaroWidget'
import { WeatherWidget } from './widgets/WeatherWidget'
import { MediaWidget } from './widgets/MediaWidget'
import { Nudges } from './Nudges'
import { SummaryCard } from './SummaryCard'
import { DetailViewRouter } from './DetailView'
import { RecoveryWidget } from './RecoveryWidget'
import { WhoopWidget } from './widgets/WhoopWidget'
import { ProgressPhotos } from './ProgressPhotos'
import { WorldMapWidget } from './WorldMapWidget'
import { JournalWidget } from './JournalWidget'
import { WorldClocksWidget } from './widgets/WorldClocksWidget'
import { InsightsWidget } from './widgets/InsightsWidget'
import { WeatherFullBackground } from '@/components/WeatherFullBackground'
import { MuscleMapWidget } from './widgets/MuscleMapWidget'
import { PRTrackerWidget } from './widgets/PRTrackerWidget'
import { TrainingLoadWidget } from './widgets/TrainingLoadWidget'
import { InjuryBodyMapWidget } from './widgets/InjuryBodyMapWidget'
import { MilestoneToast } from './MilestoneToast'
import { GridItemSizeContext } from './GridItemSizeContext'
import { detectMilestones } from '@/lib/milestones'
import { weekOverWeek } from '@/lib/comparison'
import { computeRecovery } from '@/lib/recovery'
import type { MetricId } from './DetailView'
import type {
  DailyStats,
  WorkoutSession,
  HealthStatus,
  LogEntry,
  InjuryWithCheckins,
} from '@/lib/db/queries'
import type { StreakData } from '@/lib/streaks'
import type { ParsedLog } from '@/lib/ai/types'
import type { MounjaroDose, MounjaroEffect } from '@/lib/db/mounjaro'
import type { WeatherData } from './widgets/WeatherWidget'
import type { WhoopMetrics } from '@/lib/db/whoop'

const ResponsiveGridLayout = WidthProvider(Responsive)

// ─── Widget catalog ───────────────────────────────────────────────────────────

export const WIDGET_CATALOG: Array<{
  id: string; name: string; description: string; icon: string
}> = [
  { id: 'nutr',    name: 'Nutrition',     description: 'Calories and protein tracking',        icon: '🍽️' },
  { id: 'steps',   name: 'Steps',         description: 'Daily step count and streak',           icon: '👟' },
  { id: 'sleep',   name: 'Sleep',         description: 'Sleep hours with WHOOP sync',           icon: '🌙' },
  { id: 'mood',    name: 'Mood',          description: 'Daily mood rating',                     icon: '😊' },
  { id: 'hydra',   name: 'Hydration',     description: 'Water intake tracker',                  icon: '💧' },
  { id: 'wt',      name: 'Weight',        description: 'Body weight vs goal',                   icon: '⚖️' },
  { id: 'work',    name: 'Workouts',      description: 'Today\'s workout sessions',             icon: '💪' },
  { id: 'weather', name: 'Weather',       description: 'Current local conditions',              icon: '🌤️' },
  { id: 'hab',     name: 'Habits',        description: 'Habit completion tracking',             icon: '✅' },
  { id: 'media',   name: 'Media',         description: 'Books, films, shows, songs',            icon: '🎬' },
  { id: 'supp',    name: 'Supplements',   description: 'Daily supplement log',                  icon: '💊' },
  { id: 'photos',  name: 'Photos',        description: 'Progress photo library',                icon: '📸' },
  { id: 'journal', name: 'Journal',       description: 'Daily notes and reflections',           icon: '📓' },
  { id: 'map',     name: 'World Map',     description: 'Countries visited tracker',             icon: '🗺️' },
  { id: 'clocks',  name: 'World Clocks',  description: 'Multiple time zone display',            icon: '🕐' },
  { id: 'whoop',   name: 'WHOOP',         description: 'Recovery, HRV and strain metrics',      icon: '⚡' },
  { id: 'insights',    name: 'Insights',      description: 'Correlations and trends from your data', icon: '🔍' },
  { id: 'musclemap',  name: 'Muscle Map',   description: 'SVG body map of recently worked muscles', icon: '💪' },
  { id: 'prtracker',  name: 'PR Tracker',   description: 'Personal records for exercises',           icon: '🏆' },
  { id: 'trainload',  name: 'Training Load',description: '14-day training volume and AC ratio',      icon: '📊' },
  { id: 'injurymap',  name: 'Injury Map',   description: 'Active injuries shown on body map',        icon: '🩹' },
]

// ─── Default layouts ─────────────────────────────────────────────────────────

const DEFAULT_LG: LayoutItem[] = [
  { i: 'nutr',    x: 0,  y: 0,  w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'steps',   x: 4,  y: 0,  w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'sleep',   x: 8,  y: 0,  w: 2, h: 4, minW: 2, minH: 3 },
  { i: 'mood',    x: 10, y: 0,  w: 2, h: 4, minW: 2, minH: 3 },
  { i: 'hydra',   x: 0,  y: 4,  w: 2, h: 4, minW: 2, minH: 3 },
  { i: 'wt',      x: 2,  y: 4,  w: 2, h: 4, minW: 2, minH: 3 },
  { i: 'work',    x: 4,  y: 4,  w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'weather', x: 8,  y: 4,  w: 2, h: 4, minW: 2, minH: 3 },
  { i: 'hab',     x: 10, y: 4,  w: 2, h: 4, minW: 2, minH: 3 },
  { i: 'media',   x: 0,  y: 8,  w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'supp',    x: 4,  y: 8,  w: 8, h: 4, minW: 3, minH: 3 },
  { i: 'photos',  x: 0,  y: 12, w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'journal', x: 4,  y: 12, w: 4, h: 4, minW: 2, minH: 3 },
  { i: 'map',     x: 8,  y: 12, w: 4, h: 4, minW: 3, minH: 3 },
  { i: 'clocks',  x: 0,  y: 16, w: 12, h: 3, minW: 3, minH: 2 },
  { i: 'whoop',   x: 0,  y: 19, w: 4,  h: 4, minW: 2, minH: 3 },
  { i: 'insights',   x: 4,  y: 19, w: 8,  h: 4, minW: 3, minH: 3 },
  { i: 'musclemap',  x: 0,  y: 23, w: 4,  h: 5, minW: 2, minH: 4 },
  { i: 'prtracker',  x: 4,  y: 23, w: 4,  h: 5, minW: 2, minH: 3 },
  { i: 'trainload',  x: 8,  y: 23, w: 4,  h: 5, minW: 3, minH: 3 },
  { i: 'injurymap',  x: 0,  y: 28, w: 4,  h: 5, minW: 2, minH: 4 },
]

const DEFAULT_SM: LayoutItem[] = [
  { i: 'nutr',    x: 0, y: 0,  w: 4, h: 5 },
  { i: 'steps',   x: 0, y: 5,  w: 4, h: 5 },
  { i: 'sleep',   x: 0, y: 10, w: 2, h: 4 },
  { i: 'mood',    x: 2, y: 10, w: 2, h: 4 },
  { i: 'hydra',   x: 0, y: 14, w: 2, h: 4 },
  { i: 'wt',      x: 2, y: 14, w: 2, h: 4 },
  { i: 'work',    x: 0, y: 18, w: 4, h: 4 },
  { i: 'weather', x: 0, y: 22, w: 4, h: 5 },
  { i: 'hab',     x: 0, y: 27, w: 4, h: 4 },
  { i: 'media',   x: 0, y: 31, w: 4, h: 4 },
  { i: 'supp',    x: 0, y: 35, w: 4, h: 4 },
  { i: 'photos',  x: 0, y: 39, w: 4, h: 4 },
  { i: 'journal', x: 0, y: 43, w: 4, h: 4 },
  { i: 'map',     x: 0, y: 47, w: 4, h: 3 },
  { i: 'clocks',  x: 0, y: 50, w: 4, h: 3 },
  { i: 'whoop',   x: 0, y: 53, w: 4, h: 4 },
  { i: 'insights',  x: 0, y: 57, w: 4, h: 4 },
  { i: 'musclemap', x: 0, y: 61, w: 4, h: 5 },
  { i: 'prtracker', x: 0, y: 66, w: 4, h: 5 },
  { i: 'trainload', x: 0, y: 71, w: 4, h: 5 },
  { i: 'injurymap', x: 0, y: 76, w: 4, h: 5 },
]

const DEFAULT_LAYOUTS: ResponsiveLayouts = { lg: DEFAULT_LG, sm: DEFAULT_SM }

function sanitiseItem(item: LayoutItem, maxCols: number): LayoutItem {
  return {
    ...item,
    x: Math.max(0, Math.min(item.x, maxCols - 1)),
    w: Math.max(item.minW ?? 1, Math.min(item.w, maxCols)),
    h: Math.max(item.minH ?? 1, Math.min(item.h, 24)),
  }
}

function mergeLayouts(saved: Record<string, unknown>, hiddenIds: Set<string> = new Set()): ResponsiveLayouts {
  if (!saved || typeof saved !== 'object' || Object.keys(saved).length === 0) {
    return { lg: DEFAULT_LG.filter(i => !hiddenIds.has(i.i)), sm: DEFAULT_SM.filter(i => !hiddenIds.has(i.i)) }
  }
  const savedLg = ((saved.lg as LayoutItem[] | undefined) ?? []).map(i => sanitiseItem(i, 12)).filter(i => !hiddenIds.has(i.i))
  const savedSm = ((saved.sm as LayoutItem[] | undefined) ?? []).map(i => sanitiseItem(i, 4)).filter(i => !hiddenIds.has(i.i))
  // Append any new default widgets missing from the saved layout (and not hidden)
  const lgKeys = new Set(savedLg.map(i => i.i))
  const smKeys = new Set(savedSm.map(i => i.i))
  return {
    lg: savedLg.length > 0
      ? [...savedLg, ...DEFAULT_LG.filter(item => !lgKeys.has(item.i) && !hiddenIds.has(item.i))]
      : DEFAULT_LG.filter(i => !hiddenIds.has(i.i)),
    sm: savedSm.length > 0
      ? [...savedSm, ...DEFAULT_SM.filter(item => !smKeys.has(item.i) && !hiddenIds.has(item.i))]
      : DEFAULT_SM.filter(i => !hiddenIds.has(i.i)),
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function buildContextLine(
  stats: DailyStats | null,
  health: HealthStatus | null,
  streaks: StreakData,
  workouts: WorkoutSession[],
  weather: WeatherData | null,
): string {
  const h = new Date().getHours()
  const recovery = computeRecovery(stats, health)
  const parts: string[] = []

  if (weather) {
    parts.push(`${weather.temp}° and ${weather.description} in ${weather.location}`)
  }

  const recoveryLabel =
    recovery.level === 'great' ? 'great' :
    recovery.level === 'good' ? 'good' :
    recovery.level === 'fair' ? 'fair' : 'low'

  let recoveryNote = `Recovery's ${recoveryLabel}`

  const proteinG = stats?.protein_g ?? 0
  const proteinTarget = 150
  const calories = stats?.calories ?? 0
  const steps = stats?.steps ?? 0
  const hasLogged = calories > 0 || steps > 0 || proteinG > 0
  const hasWorkout = workouts.length > 0

  if (health?.sick) {
    recoveryNote += ' — take it easy today'
  } else if (health?.injured) {
    recoveryNote += ' — mind the injury'
  } else if (!hasLogged && h >= 10) {
    recoveryNote += ' — nothing logged yet'
  } else if (proteinG >= proteinTarget) {
    recoveryNote += ' — protein target hit'
  } else if (proteinG > 0 && proteinG < proteinTarget * 0.4 && h >= 15) {
    recoveryNote += ` — protein's a little behind`
  } else if (hasWorkout) {
    recoveryNote += ' — workout logged'
  } else if (steps > 8000) {
    recoveryNote += ' — good steps today'
  } else if (streaks.logging >= 7) {
    recoveryNote += ` — ${streaks.logging}-day streak`
  }

  parts.push(recoveryNote)
  return parts.join(' · ')
}

function buildEntryTimestamps(logEntries: LogEntry[]) {
  const supTimes: Record<string, string> = {}
  const habitTimes: Record<string, string> = {}
  for (const entry of logEntries) {
    const parsed = entry.parsed_json as ParsedLog | null
    if (!parsed) continue
    for (const s of parsed.supplements ?? []) {
      const key = s.toLowerCase()
      if (!supTimes[key]) supTimes[key] = entry.logged_at
    }
    for (const h of parsed.habits_done ?? []) {
      const key = h.toLowerCase()
      if (!habitTimes[key]) habitTimes[key] = entry.logged_at
    }
  }
  return { supTimes, habitTimes }
}

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

// ─── Interactive target check ─────────────────────────────────────────────────

const INTERACTIVE = new Set(['BUTTON', 'A', 'INPUT', 'TEXTAREA', 'SELECT', 'LABEL'])

function isInteractiveTarget(el: EventTarget | null): boolean {
  if (!el || !(el instanceof Element)) return false
  let node: Element | null = el
  while (node) {
    if (INTERACTIVE.has(node.tagName)) return true
    if (node.getAttribute('role') === 'button') return true
    node = node.parentElement
  }
  return false
}

// ─── Widget wrappers ──────────────────────────────────────────────────────────

function WidgetWrapper({
  metricId,
  onOpen,
  itemW,
  itemH,
  editing,
  children,
}: {
  metricId: MetricId
  onOpen: (id: MetricId) => void
  itemW: number
  itemH: number
  editing: boolean
  children: React.ReactNode
}) {
  return (
    <GridItemSizeContext.Provider value={{ w: itemW, h: itemH }}>
      <motion.div
        variants={itemVariants}
        className={`h-full overflow-hidden${editing ? '' : ' cursor-pointer transition-transform duration-150 hover:scale-[1.015] active:scale-[0.985]'}`}
        onClick={(e) => { if (!editing && !isInteractiveTarget(e.target)) onOpen(metricId) }}
      >
        {children}
      </motion.div>
    </GridItemSizeContext.Provider>
  )
}

function PlainWrapper({
  itemW,
  itemH,
  children,
}: {
  itemW: number
  itemH: number
  children: React.ReactNode
}) {
  return (
    <GridItemSizeContext.Provider value={{ w: itemW, h: itemH }}>
      <motion.div variants={itemVariants} className="h-full overflow-hidden">
        {children}
      </motion.div>
    </GridItemSizeContext.Provider>
  )
}

// ─── Remove button (shown on each grid item in edit mode) ────────────────────

function RemoveBtn({ id, onHide }: { id: string; onHide: (id: string) => void }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => { e.stopPropagation(); onHide(id) }}
      aria-label="Hide widget"
      className="absolute top-2 right-2 z-30 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-opacity"
      style={{
        background: 'var(--negative)',
        color: '#fff',
        opacity: 0.9,
        pointerEvents: 'auto',
      }}
    >
      ×
    </button>
  )
}

// ─── Widget catalog panel ─────────────────────────────────────────────────────

function WidgetCatalogPanel({
  hiddenWidgets,
  onShow,
  onClose,
}: {
  hiddenWidgets: Set<string>
  onShow: (id: string) => void
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-2xl sm:rounded-2xl p-5 overflow-y-auto max-h-[80vh]"
        style={{ background: 'var(--surface)', border: '1px solid var(--border-strong)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-text">Add widget</h2>
          <button onClick={onClose} className="text-text-muted hover:text-text transition-colors text-lg leading-none">×</button>
        </div>
        <div className="flex flex-col gap-2">
          {WIDGET_CATALOG.map((w) => {
            const hidden = hiddenWidgets.has(w.id)
            return (
              <div
                key={w.id}
                className="flex items-center gap-3 p-3 rounded-xl border transition-colors"
                style={{
                  background: hidden ? 'var(--surface-elevated)' : 'var(--accent-dim)',
                  borderColor: hidden ? 'var(--border)' : 'var(--accent)',
                  opacity: hidden ? 1 : 0.7,
                }}
              >
                <span className="text-2xl">{w.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-text truncate">{w.name}</p>
                  <p className="text-xs text-text-subtle truncate">{w.description}</p>
                </div>
                {hidden ? (
                  <button
                    onClick={() => { onShow(w.id); onClose() }}
                    className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
                    style={{ background: 'var(--accent)', color: '#fff' }}
                  >
                    Add
                  </button>
                ) : (
                  <span className="shrink-0 text-xs font-medium" style={{ color: 'var(--accent)' }}>✓ Showing</span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Edit toggle ──────────────────────────────────────────────────────────────

function EditToggle({ editing, onToggle }: { editing: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      title={editing ? 'Lock layout' : 'Edit layout'}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-colors text-xs font-medium"
      style={{
        background: editing ? 'var(--accent-dim)' : 'transparent',
        borderColor: editing ? 'var(--accent)' : 'var(--border-strong)',
        color: editing ? 'var(--accent)' : 'var(--text-muted)',
      }}
    >
      {editing ? (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Done
        </>
      ) : (
        <>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
          </svg>
          Edit
        </>
      )}
    </button>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface DashboardGridProps {
  stats: DailyStats | null
  workouts: WorkoutSession[]
  recentWorkouts?: WorkoutSession[]
  health: HealthStatus | null
  logEntries: LogEntry[]
  injuries: InjuryWithCheckins[]
  pastInjuries: InjuryWithCheckins[]
  today: string
  streaks: StreakData
  history: DailyStats[]
  mounjaroEnabled: boolean
  mounjaroDoses: MounjaroDose[]
  mounjaroEffects: MounjaroEffect[]
  weightGoal: number | null
  savedLayouts?: Record<string, unknown>
  savedHiddenWidgets?: string[]
  whoopConnected?: boolean
  whoopToday?: WhoopMetrics | null
  whoopHistory?: WhoopMetrics[]
  weatherBgEnabled?: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardGrid({
  stats,
  workouts,
  recentWorkouts = [],
  health,
  logEntries,
  injuries,
  pastInjuries,
  today,
  streaks,
  history,
  mounjaroEnabled,
  mounjaroDoses,
  mounjaroEffects,
  weightGoal,
  savedLayouts,
  savedHiddenWidgets,
  whoopConnected = false,
  whoopToday = null,
  whoopHistory = [],
  weatherBgEnabled = false,
}: DashboardGridProps) {
  const [activeMetric, setActiveMetric] = useState<MetricId | null>(null)
  const [detailHistory, setDetailHistory] = useState<DailyStats[]>(history)
  const fetchedRef = useRef(history.length > 0)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [hiddenWidgets, setHiddenWidgets] = useState<Set<string>>(
    () => new Set(savedHiddenWidgets ?? [])
  )
  const [showCatalog, setShowCatalog] = useState(false)
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(
    () => mergeLayouts(savedLayouts ?? {}, new Set(savedHiddenWidgets ?? []))
  )
  const [lgLayout, setLgLayout] = useState<LayoutItem[]>(
    () => (mergeLayouts(savedLayouts ?? {}, new Set(savedHiddenWidgets ?? [])).lg as LayoutItem[]) ?? DEFAULT_LG
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistHidden = useCallback((hidden: Set<string>) => {
    fetch('/api/layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hidden_widgets: [...hidden] }),
    }).catch(() => {})
  }, [])

  const hideWidget = useCallback((id: string) => {
    setHiddenWidgets(prev => {
      const next = new Set(prev)
      next.add(id)
      persistHidden(next)
      return next
    })
    setLayouts(curr => ({
      lg: (curr.lg as LayoutItem[]).filter(i => i.i !== id),
      sm: (curr.sm as LayoutItem[]).filter(i => i.i !== id),
    }))
  }, [persistHidden])

  const showWidget = useCallback((id: string) => {
    const defLg = DEFAULT_LG.find(i => i.i === id)
    const defSm = DEFAULT_SM.find(i => i.i === id)
    setHiddenWidgets(prev => {
      const next = new Set(prev)
      next.delete(id)
      persistHidden(next)
      return next
    })
    setLayouts(curr => {
      const lgItems = curr.lg as LayoutItem[]
      const smItems = curr.sm as LayoutItem[]
      const maxLgY = lgItems.reduce((m, i) => Math.max(m, i.y + i.h), 0)
      const maxSmY = smItems.reduce((m, i) => Math.max(m, i.y + i.h), 0)
      return {
        lg: defLg ? [...lgItems, { ...defLg, y: maxLgY }] : lgItems,
        sm: defSm ? [...smItems, { ...defSm, y: maxSmY }] : smItems,
      }
    })
  }, [persistHidden])

  const openMetric = useCallback(async (id: MetricId) => {
    setActiveMetric(id)
    if (!fetchedRef.current) {
      fetchedRef.current = true
      try {
        const res = await fetch('/api/history?days=180')
        if (res.ok) {
          const json = await res.json()
          setDetailHistory(json.history ?? [])
        }
      } catch {}
    }
  }, [])

  const closeMetric = useCallback(() => setActiveMetric(null), [])

  const handleLayoutChange = useCallback((currentLayout: readonly LayoutItem[], allLayouts: ResponsiveLayouts) => {
    setLgLayout([...currentLayout])
    if (!editMode) return
    setLayouts(allLayouts)
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current)
    saveTimerRef.current = setTimeout(() => {
      fetch('/api/layout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layouts: allLayouts }),
      }).catch(() => {})
    }, 800)
  }, [editMode])

  useEffect(() => {
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current) }
  }, [])

  const { supTimes, habitTimes } = buildEntryTimestamps(logEntries)
  const calorieComp = useMemo(() => weekOverWeek(history, (d) => d.calories), [history])
  const proteinComp = useMemo(() => weekOverWeek(history, (d) => d.protein_g), [history])
  const stepsComp = useMemo(() => weekOverWeek(history, (d) => d.steps), [history])
  const hydraComp = useMemo(() => weekOverWeek(history, (d) => d.water_ml ?? 0), [history])

  const todayInHistory = history.find((d) => d.date === new Date().toISOString().split('T')[0]) ?? stats
  const milestones = useMemo(
    () => detectMilestones(todayInHistory ?? null, history, streaks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayInHistory?.date, history.length, streaks.logging]
  )

  const sizeMap = useMemo(() => {
    const m: Record<string, { w: number; h: number }> = {}
    for (const item of lgLayout) {
      m[item.i] = { w: item.w, h: item.h }
    }
    return m
  }, [lgLayout])

  function gs(id: string) {
    return sizeMap[id] ?? { w: 4, h: 4 }
  }

  return (
    <>
      {weatherBgEnabled && <WeatherFullBackground />}
      <motion.div
        className="flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Greeting */}
        <motion.div variants={itemVariants} className="flex items-start justify-between pb-1">
          <div>
            <h1 className="text-2xl font-bold text-text">{greeting()}</h1>
            <p className="text-sm text-text-muted mt-0.5">{today}</p>
            <p className="text-xs text-text-subtle mt-1">
              {buildContextLine(stats, health, streaks, workouts, weather)}
            </p>
          </div>
          <div className="mt-1 shrink-0">
            <EditToggle editing={editMode} onToggle={() => setEditMode((v) => !v)} />
          </div>
        </motion.div>

        {/* Recovery */}
        <motion.div variants={itemVariants}>
          <RecoveryWidget stats={stats} health={health} whoop={whoopConnected ? whoopToday : null} />
        </motion.div>

        {/* Summary */}
        <motion.div variants={itemVariants}>
          <SummaryCard stats={stats} history={history} />
        </motion.div>

        {/* Nudges */}
        <motion.div variants={itemVariants}>
          <Nudges stats={stats} logEntries={logEntries} injuries={injuries} />
        </motion.div>

        <AnimatePresence>
          {health?.sick && (
            <motion.div variants={itemVariants} key="health">
              <HealthStatusWidget status={health} />
            </motion.div>
          )}
          {injuries.length > 0 && (
            <motion.div variants={itemVariants} key="injury">
              <InjuryWidget injuries={injuries} pastInjuries={pastInjuries} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Edit mode hint */}
        <AnimatePresence>
          {editMode && (
            <motion.div
              key="edit-hint"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="rounded-xl px-4 py-2.5 text-xs flex items-center justify-between gap-3"
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
              }}
            >
              <span>Drag to rearrange · resize from corner · tap × to hide · saves automatically</span>
              <button
                onClick={() => setShowCatalog(true)}
                className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors"
                style={{ background: 'var(--accent)', color: '#fff', borderColor: 'var(--accent)' }}
              >
                + Add widget
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bento grid */}
        <motion.div variants={itemVariants} className={editMode ? 'rgl-edit-mode' : ''}>
          <ResponsiveGridLayout
            layouts={layouts}
            breakpoints={{ lg: 1024, sm: 0 }}
            cols={{ lg: 12, sm: 4 }}
            rowHeight={80}
            margin={[10, 10]}
            containerPadding={[0, 0]}
            isDraggable={editMode}
            isResizable={editMode}
            onLayoutChange={handleLayoutChange}
            useCSSTransforms
          >
            {!hiddenWidgets.has('nutr') && (
              <div key="nutr" className="relative">
                <WidgetWrapper metricId="nutrition" onOpen={openMetric} itemW={gs('nutr').w} itemH={gs('nutr').h} editing={editMode}>
                  <NutritionWidget calories={stats?.calories ?? 0} protein_g={stats?.protein_g ?? 0} proteinStreak={streaks.protein} calorieComp={calorieComp} proteinComp={proteinComp} />
                </WidgetWrapper>
                {editMode && <RemoveBtn id="nutr" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('steps') && (
              <div key="steps" className="relative">
                <WidgetWrapper metricId="steps" onOpen={openMetric} itemW={gs('steps').w} itemH={gs('steps').h} editing={editMode}>
                  <StepsWidget steps={stats?.steps ?? 0} streak={streaks.steps} comp={stepsComp} />
                </WidgetWrapper>
                {editMode && <RemoveBtn id="steps" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('sleep') && (
              <div key="sleep" className="relative">
                <WidgetWrapper metricId="sleep" onOpen={openMetric} itemW={gs('sleep').w} itemH={gs('sleep').h} editing={editMode}>
                  <SleepWidget hours={stats?.sleep_hours ?? null} source={stats?.sleep_source ?? null} />
                </WidgetWrapper>
                {editMode && <RemoveBtn id="sleep" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('mood') && (
              <div key="mood" className="relative">
                <WidgetWrapper metricId="mood" onOpen={openMetric} itemW={gs('mood').w} itemH={gs('mood').h} editing={editMode}>
                  <MoodWidget mood={stats?.mood ?? null} />
                </WidgetWrapper>
                {editMode && <RemoveBtn id="mood" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('hydra') && (
              <div key="hydra" className="relative">
                <WidgetWrapper metricId="hydration" onOpen={openMetric} itemW={gs('hydra').w} itemH={gs('hydra').h} editing={editMode}>
                  <HydrationWidget water_ml={stats?.water_ml ?? 0} streak={streaks.hydration} comp={hydraComp} />
                </WidgetWrapper>
                {editMode && <RemoveBtn id="hydra" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('wt') && (
              <div key="wt" className="relative">
                <WidgetWrapper metricId="weight" onOpen={openMetric} itemW={gs('wt').w} itemH={gs('wt').h} editing={editMode}>
                  <WeightWidget weight_kg={stats?.weight_kg ?? null} goalWeight={weightGoal} />
                </WidgetWrapper>
                {editMode && <RemoveBtn id="wt" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('work') && (
              <div key="work" className="relative">
                <PlainWrapper itemW={gs('work').w} itemH={gs('work').h}>
                  <WorkoutsWidget workouts={workouts} streak={streaks.workouts} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="work" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('weather') && (
              <div key="weather" className="relative">
                <PlainWrapper itemW={gs('weather').w} itemH={gs('weather').h}>
                  <WeatherWidget onData={setWeather} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="weather" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('hab') && (
              <div key="hab" className="relative">
                <PlainWrapper itemW={gs('hab').w} itemH={gs('hab').h}>
                  <HabitsWidget habits_done={stats?.habits_done ?? null} loggedTimes={habitTimes} streak={streaks.logging} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="hab" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('media') && (
              <div key="media" className="relative">
                <PlainWrapper itemW={gs('media').w} itemH={gs('media').h}>
                  <MediaWidget />
                </PlainWrapper>
                {editMode && <RemoveBtn id="media" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('supp') && (
              <div key="supp" className="relative">
                <PlainWrapper itemW={gs('supp').w} itemH={gs('supp').h}>
                  <SupplementsWidget supplements={stats?.supplements ?? null} loggedTimes={supTimes} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="supp" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('photos') && (
              <div key="photos" className="relative">
                <PlainWrapper itemW={gs('photos').w} itemH={gs('photos').h}>
                  <ProgressPhotos />
                </PlainWrapper>
                {editMode && <RemoveBtn id="photos" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('journal') && (
              <div key="journal" className="relative">
                <PlainWrapper itemW={gs('journal').w} itemH={gs('journal').h}>
                  <JournalWidget stats={stats} workouts={workouts} history={history} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="journal" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('map') && (
              <div key="map" className="relative">
                <PlainWrapper itemW={gs('map').w} itemH={gs('map').h}>
                  <WorldMapWidget />
                </PlainWrapper>
                {editMode && <RemoveBtn id="map" onHide={hideWidget} />}
              </div>
            )}

            {!hiddenWidgets.has('clocks') && (
              <div key="clocks" className="relative">
                <PlainWrapper itemW={gs('clocks').w} itemH={gs('clocks').h}>
                  <WorldClocksWidget />
                </PlainWrapper>
                {editMode && <RemoveBtn id="clocks" onHide={hideWidget} />}
              </div>
            )}

            {whoopConnected && !hiddenWidgets.has('whoop') && (
              <div key="whoop" className="relative">
                <PlainWrapper itemW={gs('whoop').w} itemH={gs('whoop').h}>
                  <WhoopWidget today={whoopToday} history={whoopHistory} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="whoop" onHide={hideWidget} />}
              </div>
            )}
            {!hiddenWidgets.has('insights') && (
              <div key="insights" className="relative">
                <PlainWrapper itemW={gs('insights').w} itemH={gs('insights').h}>
                  <InsightsWidget />
                </PlainWrapper>
                {editMode && <RemoveBtn id="insights" onHide={hideWidget} />}
              </div>
            )}
            {!hiddenWidgets.has('musclemap') && (
              <div key="musclemap" className="relative">
                <PlainWrapper itemW={gs('musclemap').w} itemH={gs('musclemap').h}>
                  <MuscleMapWidget recentWorkouts={recentWorkouts} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="musclemap" onHide={hideWidget} />}
              </div>
            )}
            {!hiddenWidgets.has('prtracker') && (
              <div key="prtracker" className="relative">
                <PlainWrapper itemW={gs('prtracker').w} itemH={gs('prtracker').h}>
                  <PRTrackerWidget />
                </PlainWrapper>
                {editMode && <RemoveBtn id="prtracker" onHide={hideWidget} />}
              </div>
            )}
            {!hiddenWidgets.has('trainload') && (
              <div key="trainload" className="relative">
                <PlainWrapper itemW={gs('trainload').w} itemH={gs('trainload').h}>
                  <TrainingLoadWidget recentWorkouts={recentWorkouts} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="trainload" onHide={hideWidget} />}
              </div>
            )}
            {!hiddenWidgets.has('injurymap') && (
              <div key="injurymap" className="relative">
                <PlainWrapper itemW={gs('injurymap').w} itemH={gs('injurymap').h}>
                  <InjuryBodyMapWidget activeInjuries={injuries} allInjuries={[...injuries, ...pastInjuries]} />
                </PlainWrapper>
                {editMode && <RemoveBtn id="injurymap" onHide={hideWidget} />}
              </div>
            )}
          </ResponsiveGridLayout>
        </motion.div>

        {mounjaroEnabled && (
          <motion.div variants={itemVariants}>
            <MounjaroWidget doses={mounjaroDoses} effects={mounjaroEffects} />
          </motion.div>
        )}

        <motion.div variants={itemVariants}>
          <TimelineWidget entries={logEntries} />
        </motion.div>
      </motion.div>

      <DetailViewRouter
        metric={activeMetric}
        history={detailHistory}
        onClose={closeMetric}
        weightGoal={weightGoal}
        todayStats={stats}
        logEntries={logEntries}
      />

      <MilestoneToast milestones={milestones} />

      {showCatalog && (
        <WidgetCatalogPanel
          hiddenWidgets={hiddenWidgets}
          onShow={showWidget}
          onClose={() => setShowCatalog(false)}
        />
      )}
    </>
  )
}
