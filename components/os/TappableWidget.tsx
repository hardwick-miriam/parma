'use client'

import { useState } from 'react'
import { WidgetDetailRouter, type WidgetId } from '@/components/dashboard/WidgetDetailSheets'
import type { DailyStats, WorkoutSession, InjuryWithCheckins } from '@/lib/db/queries'
import type { WhoopMetrics } from '@/lib/db/whoop'
import type { WeatherData } from '@/components/dashboard/widgets/WeatherWidget'
import type { StreakData } from '@/lib/streaks'

interface TappableWidgetProps {
  widgetId: WidgetId
  children: React.ReactNode
  workouts?: WorkoutSession[]
  recentWorkouts?: WorkoutSession[]
  history?: DailyStats[]
  whoopHistory?: WhoopMetrics[]
  streaks?: StreakData
  injuries?: InjuryWithCheckins[]
  visitedCountries?: string[]
  weather?: WeatherData | null
}

/** Restores the tap-to-detail behaviour the old DashboardGrid gave every widget, reusing WidgetDetailRouter unmodified so module pages get the same rich detail sheets. */
export function TappableWidget({ widgetId, children, ...detailProps }: TappableWidgetProps) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">{children}</div>
      <WidgetDetailRouter widget={open ? widgetId : null} onClose={() => setOpen(false)} {...detailProps} />
    </>
  )
}
