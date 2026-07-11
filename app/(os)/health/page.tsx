export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import {
  getTodayStats, getHealthStatus, getInjuriesWithCheckins, getResolvedInjuriesWithCheckins,
} from '@/lib/db/queries'
import { getDailyStatsHistory } from '@/lib/db/history'
import { getWhoopConnection, getLatestWhoopMetrics, getWhoopMetrics } from '@/lib/db/whoop'
import { getUserPreferences } from '@/lib/db/preferences'
import { RecoveryWidget } from '@/components/dashboard/RecoveryWidget'
import { WhoopWidget } from '@/components/dashboard/widgets/WhoopWidget'
import { HealthStatusWidget } from '@/components/dashboard/widgets/HealthStatusWidget'
import { InjuryWidget } from '@/components/dashboard/widgets/InjuryWidget'
import { SleepDebtWidget } from '@/components/dashboard/widgets/SleepDebtWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { TappableWidget } from '@/components/os/TappableWidget'

export default async function HealthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const whoopConn = await getWhoopConnection(user.id).catch(() => null)
  const whoopConnected = !!whoopConn

  const [stats, health, injuries, pastInjuries, history, whoopToday, whoopHistory, prefs] = await Promise.all([
    getTodayStats(user.id).catch(() => null),
    getHealthStatus(user.id).catch(() => null),
    getInjuriesWithCheckins(user.id).catch(() => []),
    getResolvedInjuriesWithCheckins(user.id).catch(() => []),
    getDailyStatsHistory(user.id, 60).catch(() => []),
    whoopConnected ? getLatestWhoopMetrics(user.id).catch(() => null) : null,
    whoopConnected ? getWhoopMetrics(user.id, 14).catch(() => []) : [],
    getUserPreferences(user.id).catch(() => null),
  ])
  const hiddenWidgets = new Set(prefs?.hidden_widgets ?? [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Health</h1>

      <RecoveryWidget stats={stats} health={health} whoop={whoopToday} />

      {!hiddenWidgets.has('whoop') && (
        <TappableWidget widgetId="whoop" whoopHistory={whoopHistory}>
          <ModulePageClient w={8} h={5}>
            <WhoopWidget today={whoopToday} history={whoopHistory} />
          </ModulePageClient>
        </TappableWidget>
      )}

      {!hiddenWidgets.has('sleepdebt') && (
        <TappableWidget widgetId="sleepdebt" history={history}>
          <ModulePageClient w={8} h={5}>
            <SleepDebtWidget history={history} />
          </ModulePageClient>
        </TappableWidget>
      )}

      <HealthStatusWidget status={health} />

      <div className="flex flex-col gap-3">
        <InjuryWidget injuries={injuries} pastInjuries={pastInjuries} />
      </div>
    </div>
  )
}
