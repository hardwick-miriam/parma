'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import type { WidgetId } from '@/components/dashboard/WidgetDetailSheets'
import type { DailyStats, WorkoutSession, InjuryWithCheckins } from '@/lib/db/queries'
import type { WhoopMetrics } from '@/lib/db/whoop'
import type { WeatherData } from '@/components/dashboard/widgets/WeatherWidget'
import type { StreakData } from '@/lib/streaks'

// Dynamically imported AND only rendered once `open` is true (see below) —
// WidgetDetailSheets pulls in MetricAreaChart (recharts), so every page using
// ANY TappableWidget (Main/Health/Gym all use several) was paying that cost
// up front even for users who never tap a widget open.
const WidgetDetailRouter = dynamic(
  () => import('@/components/dashboard/WidgetDetailSheets').then((m) => m.WidgetDetailRouter),
  { ssr: false }
)

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
  // Defers the dynamic import until the first tap (see above), but once
  // opened for the first time, WidgetDetailRouter stays mounted (fed `null`
  // on close, not unmounted) so its internal AnimatePresence exit animation
  // still plays on every close after that — only the very first open skips it.
  const [hasOpened, setHasOpened] = useState(false)
  return (
    <>
      <div onClick={() => { setOpen(true); setHasOpened(true) }} className="cursor-pointer">{children}</div>
      {hasOpened && <WidgetDetailRouter widget={open ? widgetId : null} onClose={() => setOpen(false)} {...detailProps} />}
    </>
  )
}
