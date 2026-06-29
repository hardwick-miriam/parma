'use client'

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
import type {
  DailyStats,
  WorkoutSession,
  HealthStatus,
  LogEntry,
  InjuryWithCheckins,
} from '@/lib/db/queries'

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

interface DashboardGridProps {
  stats: DailyStats | null
  workouts: WorkoutSession[]
  health: HealthStatus | null
  logEntries: LogEntry[]
  injuries: InjuryWithCheckins[]
  pastInjuries: InjuryWithCheckins[]
  today: string
}

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

export function DashboardGrid({
  stats,
  workouts,
  health,
  logEntries,
  injuries,
  pastInjuries,
  today,
}: DashboardGridProps) {
  return (
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
          <NutritionWidget
            calories={stats?.calories ?? 0}
            protein_g={stats?.protein_g ?? 0}
          />
        </div>

        <div className="bento-steps">
          <StepsWidget steps={stats?.steps ?? 0} />
        </div>

        <div className="bento-sleep">
          <SleepWidget hours={stats?.sleep_hours ?? null} />
        </div>

        <div className="bento-mood">
          <MoodWidget mood={stats?.mood ?? null} />
        </div>

        <div className="bento-hydra">
          <HydrationWidget water_ml={stats?.water_ml ?? 0} />
        </div>

        <div className="bento-wt">
          <WeightWidget weight_kg={stats?.weight_kg ?? null} />
        </div>

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
  )
}
