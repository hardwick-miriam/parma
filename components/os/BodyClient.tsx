'use client'

import { useQuery } from '@tanstack/react-query'
import { BodyWidget } from '@/components/dashboard/widgets/BodyWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { BodyMeasurementsSection } from '@/components/os/BodyMeasurementsSection'
import { ProgressPhotosSection } from '@/components/os/ProgressPhotosSection'
import type { BodyPageData } from '@/lib/pageData/body'

export function BodyClient({ initialData }: { initialData: BodyPageData }) {
  const { data } = useQuery({
    queryKey: ['body-summary'],
    queryFn: async () => {
      const res = await fetch('/api/body-summary')
      if (!res.ok) throw new Error('Failed to load Body summary')
      return res.json() as Promise<BodyPageData>
    },
    initialData,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Body</h1>
      <ModulePageClient w={10} h={9}>
        <BodyWidget recentWorkouts={data.recentWorkouts} activeInjuries={data.activeInjuries} recoveryMap={data.recoveryMap} />
      </ModulePageClient>

      <ProgressPhotosSection />

      <div>
        <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Measurements</p>
        <BodyMeasurementsSection />
      </div>
    </div>
  )
}
