'use client'

import Link from 'next/link'
import { CircularProgress } from '@/components/ui/CircularProgress'
import { computeRecovery } from '@/lib/recovery'
import { MODULES } from '@/components/os/Sidebar'
import { WeatherWidget } from '@/components/dashboard/widgets/WeatherWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import type { DailyStats, HealthStatus, WorkoutSession } from '@/lib/db/queries'
import type { WhoopMetrics } from '@/lib/db/whoop'

interface MainClientProps {
  stats: DailyStats | null
  health: HealthStatus | null
  whoop: WhoopMetrics | null
  recentWorkouts: WorkoutSession[]
  targets: {
    calorie_target: number
    protein_target_g: number
    carbs_target_g: number
    fat_target_g: number
  }
}

function MacroBar({ label, value, target }: { label: string; value: number; target: number }) {
  const pct = Math.min(100, target > 0 ? (value / target) * 100 : 0)
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-xs text-text-muted">
        <span>{label}</span>
        <span>{Math.round(value)}g / {Math.round(target)}g</span>
      </div>
      <div className="h-2 rounded-full bg-surface-elevated overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
      </div>
    </div>
  )
}

function daysSince(dateStr: string | undefined): number | null {
  if (!dateStr) return null
  const then = new Date(dateStr + 'T12:00:00')
  const now = new Date()
  return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24))
}

export function MainClient({ stats, health, whoop, recentWorkouts, targets }: MainClientProps) {
  const recovery = computeRecovery(stats, health, whoop)
  const recoveryColor = {
    poor: 'var(--negative)', fair: 'var(--warning)', good: 'var(--positive)', great: 'var(--accent)',
  }[recovery.level]

  const calories = stats?.calories ?? 0
  const sorted = [...recentWorkouts].sort((a, b) => b.date.localeCompare(a.date))
  const lastWorkout = sorted[0]
  const since = daysSince(lastWorkout?.date)
  const last7Load = sorted.filter((w) => (daysSince(w.date) ?? 99) < 7).length

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-text">How am I doing today</h1>

      <ModulePageClient w={8} h={5}>
        <WeatherWidget />
      </ModulePageClient>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recovery ring — big, cinematic */}
        <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col items-center gap-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest self-start">Recovery</p>
          <CircularProgress value={recovery.score} max={100} size={160} strokeWidth={10} color={recoveryColor} unit="recovery" countUp />
          <p className="text-sm text-text-muted text-center">{recovery.explanation}</p>
        </div>

        {/* Calories ring + macro bars */}
        <div className="rounded-2xl bg-surface border border-border p-6 flex flex-col items-center gap-4">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest self-start">Nutrition today</p>
          <CircularProgress value={calories} max={targets.calorie_target} size={140} strokeWidth={9} unit="kcal" countUp showTargetGlow />
          <div className="w-full flex flex-col gap-2">
            <MacroBar label="Protein" value={Number(stats?.protein_g ?? 0)} target={targets.protein_target_g} />
            <MacroBar label="Carbs" value={Number(stats?.carbs_g ?? 0)} target={targets.carbs_target_g} />
            <MacroBar label="Fat" value={Number(stats?.fat_g ?? 0)} target={targets.fat_target_g} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Training status */}
        <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-2">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Training status</p>
          {lastWorkout ? (
            <>
              <p className="text-lg font-bold text-text">{lastWorkout.description}</p>
              <p className="text-sm text-text-muted">
                {since === 0 ? 'Today' : since === 1 ? '1 day ago' : `${since} days ago`}
              </p>
            </>
          ) : (
            <p className="text-sm text-text-subtle">No recent workouts logged</p>
          )}
          <p className="text-xs text-text-faint mt-1">{last7Load} session{last7Load === 1 ? '' : 's'} in the last 7 days</p>
        </div>

        {/* Key vitals */}
        <div className="rounded-2xl bg-surface border border-border p-5 flex flex-col gap-3">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-widest">Key vitals</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-xl font-bold text-text tabular-nums">{whoop?.hrv_rmssd_milli != null ? Math.round(whoop.hrv_rmssd_milli) : '—'}</p>
              <p className="text-[11px] text-text-subtle">HRV ms</p>
            </div>
            <div>
              <p className="text-xl font-bold text-text tabular-nums">{whoop?.resting_hr ?? '—'}</p>
              <p className="text-[11px] text-text-subtle">RHR bpm</p>
            </div>
            <div>
              <p className="text-xl font-bold text-text tabular-nums">{stats?.sleep_hours ?? '—'}</p>
              <p className="text-[11px] text-text-subtle">Sleep hrs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick-nav tiles */}
      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Modules</p>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
          {MODULES.filter((m) => m.href !== '/main').map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="rounded-xl bg-surface border border-border p-4 flex flex-col items-center gap-1.5 hover:border-border-strong transition-colors"
            >
              <span className="text-2xl" aria-hidden>{m.icon}</span>
              <span className="text-xs font-medium text-text-muted">{m.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
