'use client'

import { useState, useCallback, useRef } from 'react'
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
import { DetailViewRouter } from './DetailView'
import type { MetricId } from './DetailView'
import type {
  DailyStats,
  WorkoutSession,
  HealthStatus,
  LogEntry,
  InjuryWithCheckins,
} from '@/lib/db/queries'

// ---- Greeting ---------------------------------------------------------------

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

// ---- Animation variants -----------------------------------------------------

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: 'easeOut' as const },
  },
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

interface WidgetWrapperProps {
  metricId: MetricId
  onOpen: (id: MetricId) => void
  className?: string
  children: React.ReactNode
}

function WidgetWrapper({ metricId, onOpen, className, children }: WidgetWrapperProps) {
  return (
    <div
      className={`cursor-pointer h-full transition-transform duration-150 hover:scale-[1.015] active:scale-[0.985] ${className ?? ''}`}
      onClick={(e) => {
        if (!isInteractiveTarget(e.target)) onOpen(metricId)
      }}
    >
      {children}
    </div>
  )
}

// ---- Main component ---------------------------------------------------------

interface DashboardGridProps {
  stats: DailyStats | null
  workouts: WorkoutSession[]
  health: HealthStatus | null
  logEntries: LogEntry[]
  injuries: InjuryWithCheckins[]
  pastInjuries: InjuryWithCheckins[]
  today: string
}

export function DashboardGrid({
  stats,
  workouts,
  health,
  logEntries,
  injuries,
  pastInjuries,
  today,
}: DashboardGridProps) {
  const [activeMetric, setActiveMetric] = useState<MetricId | null>(null)
  const [history, setHistory] = useState<DailyStats[]>([])
  const fetchedRef = useRef(false)

  const openMetric = useCallback(async (id: MetricId) => {
    setActiveMetric(id)
    if (!fetchedRef.current) {
      fetchedRef.current = true
      try {
        const res = await fetch('/api/history?days=180')
        if (res.ok) {
          const json = await res.json()
          setHistory(json.history ?? [])
        }
      } catch {
        // non-fatal — detail view shows "no data" gracefully
      }
    }
  }, [])

  const closeMetric = useCallback(() => setActiveMetric(null), [])

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

        {/* Full-width health / injury banners */}
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
              />
            </WidgetWrapper>
          </div>

          <div className="bento-steps">
            <WidgetWrapper metricId="steps" onOpen={openMetric}>
              <StepsWidget steps={stats?.steps ?? 0} />
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
              <HydrationWidget water_ml={stats?.water_ml ?? 0} />
            </WidgetWrapper>
          </div>

          <div className="bento-wt">
            <WidgetWrapper metricId="weight" onOpen={openMetric}>
              <WeightWidget weight_kg={stats?.weight_kg ?? null} />
            </WidgetWrapper>
          </div>

          {/* Non-expandable widgets — no detail view yet */}
          <div className="bento-work">
            <WorkoutsWidget workouts={workouts} />
          </div>

          <div className="bento-hab">
            <HabitsWidget habits_done={stats?.habits_done ?? null} />
          </div>

          <div className="bento-supp">
            <SupplementsWidget supplements={stats?.supplements ?? null} />
          </div>
        </motion.div>

        {/* Timeline below grid */}
        <motion.div variants={itemVariants}>
          <TimelineWidget entries={logEntries} />
        </motion.div>
      </motion.div>

      {/* Detail view overlay */}
      <DetailViewRouter
        metric={activeMetric}
        history={history}
        onClose={closeMetric}
      />
    </>
  )
}
