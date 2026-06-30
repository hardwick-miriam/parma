'use client'

import { useState, useCallback, useRef, useMemo } from 'react'
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
import { Nudges } from './Nudges'
import { SummaryCard } from './SummaryCard'
import { DetailViewRouter } from './DetailView'
import { RecoveryWidget } from './RecoveryWidget'
import { MilestoneToast } from './MilestoneToast'
import { detectMilestones } from '@/lib/milestones'
import { weekOverWeek } from '@/lib/comparison'
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

// ---- Helpers ----------------------------------------------------------------

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
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

// ---- Animation variants -----------------------------------------------------

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: 'easeOut' as const } },
}

// ---- Clickable widget wrapper -----------------------------------------------

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

function WidgetWrapper({
  metricId,
  onOpen,
  className,
  children,
}: {
  metricId: MetricId
  onOpen: (id: MetricId) => void
  className?: string
  children: React.ReactNode
}) {
  return (
    <div
      className={`cursor-pointer h-full transition-transform duration-150 hover:scale-[1.015] active:scale-[0.985] ${className ?? ''}`}
      onClick={(e) => { if (!isInteractiveTarget(e.target)) onOpen(metricId) }}
    >
      {children}
    </div>
  )
}

// ---- Props ------------------------------------------------------------------

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
}

// ---- Component --------------------------------------------------------------

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
}: DashboardGridProps) {
  const [activeMetric, setActiveMetric] = useState<MetricId | null>(null)
  const [detailHistory, setDetailHistory] = useState<DailyStats[]>(history)
  const fetchedRef = useRef(history.length > 0)

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

  const { supTimes, habitTimes } = buildEntryTimestamps(logEntries)

  // Comparison badges (week over week)
  const calorieComp = useMemo(() => weekOverWeek(history, (d) => d.calories), [history])
  const proteinComp = useMemo(() => weekOverWeek(history, (d) => d.protein_g), [history])
  const stepsComp = useMemo(() => weekOverWeek(history, (d) => d.steps), [history])
  const hydraComp = useMemo(() => weekOverWeek(history, (d) => d.water_ml ?? 0), [history])

  // Milestones
  const todayInHistory = history.find((d) => d.date === new Date().toISOString().split('T')[0]) ?? stats
  const milestones = useMemo(
    () => detectMilestones(todayInHistory ?? null, history, streaks),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [todayInHistory?.date, history.length, streaks.logging]
  )

  return (
    <>
      <motion.div
        className="flex flex-col gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {/* Greeting */}
        <motion.div variants={itemVariants} className="pb-1">
          <h1 className="text-2xl font-bold text-text">{greeting()}</h1>
          <p className="text-sm text-text-muted mt-0.5">{today}</p>
        </motion.div>

        {/* Recovery / readiness score */}
        <motion.div variants={itemVariants}>
          <RecoveryWidget stats={stats} health={health} />
        </motion.div>

        {/* Evening/weekly summary */}
        <motion.div variants={itemVariants}>
          <SummaryCard stats={stats} history={history} />
        </motion.div>

        {/* Nudges */}
        <motion.div variants={itemVariants}>
          <Nudges stats={stats} logEntries={logEntries} injuries={injuries} />
        </motion.div>

        {/* Health / injury banners */}
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

        {/* Bento grid */}
        <motion.div variants={itemVariants} className="bento-grid">
          <div className="bento-nutr">
            <WidgetWrapper metricId="nutrition" onOpen={openMetric}>
              <NutritionWidget
                calories={stats?.calories ?? 0}
                protein_g={stats?.protein_g ?? 0}
                proteinStreak={streaks.protein}
                calorieComp={calorieComp}
                proteinComp={proteinComp}
              />
            </WidgetWrapper>
          </div>

          <div className="bento-steps">
            <WidgetWrapper metricId="steps" onOpen={openMetric}>
              <StepsWidget steps={stats?.steps ?? 0} streak={streaks.steps} comp={stepsComp} />
            </WidgetWrapper>
          </div>

          <div className="bento-sleep">
            <WidgetWrapper metricId="sleep" onOpen={openMetric}>
              <SleepWidget hours={stats?.sleep_hours ?? null} />
            </WidgetWrapper>
          </div>

          <div className="bento-mood">
            <WidgetWrapper metricId="mood" onOpen={openMetric}>
              <MoodWidget mood={stats?.mood ?? null} />
            </WidgetWrapper>
          </div>

          <div className="bento-hydra">
            <WidgetWrapper metricId="hydration" onOpen={openMetric}>
              <HydrationWidget water_ml={stats?.water_ml ?? 0} streak={streaks.hydration} comp={hydraComp} />
            </WidgetWrapper>
          </div>

          <div className="bento-wt">
            <WidgetWrapper metricId="weight" onOpen={openMetric}>
              <WeightWidget weight_kg={stats?.weight_kg ?? null} goalWeight={weightGoal} />
            </WidgetWrapper>
          </div>

          <div className="bento-work">
            <WorkoutsWidget workouts={workouts} />
          </div>

          <div className="bento-hab">
            <HabitsWidget
              habits_done={stats?.habits_done ?? null}
              loggedTimes={habitTimes}
              streak={streaks.logging}
            />
          </div>

          <div className="bento-supp">
            <SupplementsWidget
              supplements={stats?.supplements ?? null}
              loggedTimes={supTimes}
            />
          </div>
        </motion.div>

        {/* Mounjaro widget (optional) */}
        {mounjaroEnabled && (
          <motion.div variants={itemVariants}>
            <MounjaroWidget doses={mounjaroDoses} effects={mounjaroEffects} />
          </motion.div>
        )}

        {/* Timeline */}
        <motion.div variants={itemVariants}>
          <TimelineWidget entries={logEntries} />
        </motion.div>
      </motion.div>

      {/* Detail view overlay */}
      <DetailViewRouter
        metric={activeMetric}
        history={detailHistory}
        onClose={closeMetric}
        weightGoal={weightGoal}
        todayStats={stats}
      />

      {/* Milestone toasts */}
      <MilestoneToast milestones={milestones} />
    </>
  )
}
