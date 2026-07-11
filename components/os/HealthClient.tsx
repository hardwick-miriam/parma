'use client'

import { useQuery } from '@tanstack/react-query'
import { RecoveryWidget } from '@/components/dashboard/RecoveryWidget'
import { WhoopWidget } from '@/components/dashboard/widgets/WhoopWidget'
import { HealthStatusWidget } from '@/components/dashboard/widgets/HealthStatusWidget'
import { InjuryWidget } from '@/components/dashboard/widgets/InjuryWidget'
import { SleepDebtWidget } from '@/components/dashboard/widgets/SleepDebtWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { TappableWidget } from '@/components/os/TappableWidget'
import { MoodCorrelationsSection } from '@/components/os/MoodCorrelationsSection'
import { DoseDueBanner } from '@/components/os/DoseDueBanner'
import { MounjaroHistorySection } from '@/components/os/MounjaroHistorySection'
import type { HealthPageData } from '@/lib/pageData/health'

export function HealthClient({ initialData }: { initialData: HealthPageData }) {
  // Same live-refetch pattern as MainClient: initialData gives an instant
  // first paint, RealtimeSync invalidates ['health-summary'] on any relevant
  // DB change, TanStack refetches in the background and swaps data in place.
  const { data } = useQuery({
    queryKey: ['health-summary'],
    queryFn: async () => {
      const res = await fetch('/api/health-summary')
      if (!res.ok) throw new Error('Failed to load Health summary')
      return res.json() as Promise<HealthPageData>
    },
    initialData,
  })
  const { stats, health, injuries, pastInjuries, history, whoop, whoopHistory, whoopConnected, hiddenWidgets, mounjaroEnabled } = data
  const hidden = new Set(hiddenWidgets)

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Health</h1>

      {mounjaroEnabled && <DoseDueBanner mounjaroEnabled={mounjaroEnabled} />}
      {mounjaroEnabled && <MounjaroHistorySection />}

      <RecoveryWidget stats={stats} health={health} whoop={whoop} />

      {whoopConnected && !hidden.has('whoop') && (
        <TappableWidget widgetId="whoop" whoopHistory={whoopHistory}>
          <ModulePageClient w={8} h={5}>
            <WhoopWidget today={whoop} history={whoopHistory} />
          </ModulePageClient>
        </TappableWidget>
      )}

      {!hidden.has('sleepdebt') && (
        <TappableWidget widgetId="sleepdebt" history={history}>
          <ModulePageClient w={8} h={5}>
            <SleepDebtWidget history={history} />
          </ModulePageClient>
        </TappableWidget>
      )}

      <HealthStatusWidget status={health} />

      <MoodCorrelationsSection />

      <div className="flex flex-col gap-3">
        <InjuryWidget injuries={injuries} pastInjuries={pastInjuries} />
      </div>
    </div>
  )
}
