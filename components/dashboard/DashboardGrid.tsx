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
]

const DEFAULT_LAYOUTS: ResponsiveLayouts = { lg: DEFAULT_LG, sm: DEFAULT_SM }

function mergeLayouts(saved: Record<string, unknown>): ResponsiveLayouts {
  if (!saved || typeof saved !== 'object' || Object.keys(saved).length === 0) {
    return DEFAULT_LAYOUTS
  }
  const savedLg = (saved.lg as LayoutItem[] | undefined) ?? []
  const savedSm = (saved.sm as LayoutItem[] | undefined) ?? []
  // Append any new default widgets missing from the saved layout so widgets
  // added after the user last saved their layout become visible.
  const lgKeys = new Set(savedLg.map(i => i.i))
  const smKeys = new Set(savedSm.map(i => i.i))
  return {
    lg: savedLg.length > 0
      ? [...savedLg, ...DEFAULT_LG.filter(item => !lgKeys.has(item.i))]
      : DEFAULT_LG,
    sm: savedSm.length > 0
      ? [...savedSm, ...DEFAULT_SM.filter(item => !smKeys.has(item.i))]
      : DEFAULT_SM,
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
  children,
}: {
  metricId: MetricId
  onOpen: (id: MetricId) => void
  itemW: number
  itemH: number
  children: React.ReactNode
}) {
  return (
    <GridItemSizeContext.Provider value={{ w: itemW, h: itemH }}>
      <motion.div
        variants={itemVariants}
        className="cursor-pointer h-full transition-transform duration-150 hover:scale-[1.015] active:scale-[0.985]"
        onClick={(e) => { if (!isInteractiveTarget(e.target)) onOpen(metricId) }}
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
      <motion.div variants={itemVariants} className="h-full">
        {children}
      </motion.div>
    </GridItemSizeContext.Provider>
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
  whoopConnected?: boolean
  whoopToday?: WhoopMetrics | null
  whoopHistory?: WhoopMetrics[]
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DashboardGrid({
  stats,
  workouts,
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
  whoopConnected = false,
  whoopToday = null,
  whoopHistory = [],
}: DashboardGridProps) {
  const [activeMetric, setActiveMetric] = useState<MetricId | null>(null)
  const [detailHistory, setDetailHistory] = useState<DailyStats[]>(history)
  const fetchedRef = useRef(history.length > 0)
  const [weather, setWeather] = useState<WeatherData | null>(null)
  const [editMode, setEditMode] = useState(false)
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(() => mergeLayouts(savedLayouts ?? {}))
  const [lgLayout, setLgLayout] = useState<LayoutItem[]>(
    () => (mergeLayouts(savedLayouts ?? {}).lg as LayoutItem[]) ?? DEFAULT_LG
  )
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

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
              className="rounded-xl px-4 py-2.5 text-xs"
              style={{
                background: 'var(--accent-dim)',
                border: '1px solid var(--accent)',
                color: 'var(--accent)',
              }}
            >
              Drag widgets to rearrange · resize from the bottom-right corner · saves automatically
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
            draggableHandle=".rgl-drag-handle"
            useCSSTransforms
          >
            <div key="nutr" style={{ cursor: 'default' }}>
              <WidgetWrapper metricId="nutrition" onOpen={openMetric} itemW={gs('nutr').w} itemH={gs('nutr').h}>
                <NutritionWidget
                  calories={stats?.calories ?? 0}
                  protein_g={stats?.protein_g ?? 0}
                  proteinStreak={streaks.protein}
                  calorieComp={calorieComp}
                  proteinComp={proteinComp}
                />
              </WidgetWrapper>
            </div>

            <div key="steps" style={{ cursor: 'default' }}>
              <WidgetWrapper metricId="steps" onOpen={openMetric} itemW={gs('steps').w} itemH={gs('steps').h}>
                <StepsWidget steps={stats?.steps ?? 0} streak={streaks.steps} comp={stepsComp} />
              </WidgetWrapper>
            </div>

            <div key="sleep" style={{ cursor: 'default' }}>
              <WidgetWrapper metricId="sleep" onOpen={openMetric} itemW={gs('sleep').w} itemH={gs('sleep').h}>
                <SleepWidget hours={stats?.sleep_hours ?? null} />
              </WidgetWrapper>
            </div>

            <div key="mood" style={{ cursor: 'default' }}>
              <WidgetWrapper metricId="mood" onOpen={openMetric} itemW={gs('mood').w} itemH={gs('mood').h}>
                <MoodWidget mood={stats?.mood ?? null} />
              </WidgetWrapper>
            </div>

            <div key="hydra" style={{ cursor: 'default' }}>
              <WidgetWrapper metricId="hydration" onOpen={openMetric} itemW={gs('hydra').w} itemH={gs('hydra').h}>
                <HydrationWidget water_ml={stats?.water_ml ?? 0} streak={streaks.hydration} comp={hydraComp} />
              </WidgetWrapper>
            </div>

            <div key="wt" style={{ cursor: 'default' }}>
              <WidgetWrapper metricId="weight" onOpen={openMetric} itemW={gs('wt').w} itemH={gs('wt').h}>
                <WeightWidget weight_kg={stats?.weight_kg ?? null} goalWeight={weightGoal} />
              </WidgetWrapper>
            </div>

            <div key="work" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('work').w} itemH={gs('work').h}>
                <WorkoutsWidget workouts={workouts} streak={streaks.workouts} />
              </PlainWrapper>
            </div>

            <div key="weather" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('weather').w} itemH={gs('weather').h}>
                <WeatherWidget onData={setWeather} />
              </PlainWrapper>
            </div>

            <div key="hab" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('hab').w} itemH={gs('hab').h}>
                <HabitsWidget
                  habits_done={stats?.habits_done ?? null}
                  loggedTimes={habitTimes}
                  streak={streaks.logging}
                />
              </PlainWrapper>
            </div>

            <div key="media" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('media').w} itemH={gs('media').h}>
                <MediaWidget />
              </PlainWrapper>
            </div>

            <div key="supp" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('supp').w} itemH={gs('supp').h}>
                <SupplementsWidget
                  supplements={stats?.supplements ?? null}
                  loggedTimes={supTimes}
                />
              </PlainWrapper>
            </div>

            <div key="photos" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('photos').w} itemH={gs('photos').h}>
                <ProgressPhotos />
              </PlainWrapper>
            </div>

            <div key="journal" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('journal').w} itemH={gs('journal').h}>
                <JournalWidget stats={stats} workouts={workouts} history={history} />
              </PlainWrapper>
            </div>

            <div key="map" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('map').w} itemH={gs('map').h}>
                <WorldMapWidget />
              </PlainWrapper>
            </div>

            <div key="clocks" style={{ cursor: 'default' }}>
              <PlainWrapper itemW={gs('clocks').w} itemH={gs('clocks').h}>
                <WorldClocksWidget />
              </PlainWrapper>
            </div>

            {whoopConnected && (
              <div key="whoop" style={{ cursor: 'default' }}>
                <PlainWrapper itemW={gs('whoop').w} itemH={gs('whoop').h}>
                  <WhoopWidget today={whoopToday} history={whoopHistory} />
                </PlainWrapper>
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
    </>
  )
}
