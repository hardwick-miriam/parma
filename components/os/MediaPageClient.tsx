'use client'

import dynamic from 'next/dynamic'
import { useQuery } from '@tanstack/react-query'
import { MediaWidget } from '@/components/dashboard/widgets/MediaWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { MediaFavouritesShelf } from '@/components/os/MediaFavouritesShelf'
import { LearningTrackerSection } from '@/components/os/LearningTrackerSection'
import type { MediaEntry } from '@/lib/db/media'

const ChartSkeleton = () => <div className="rounded-2xl bg-surface border border-border h-64 animate-pulse" />
const MediaTasteRadar = dynamic(() => import('@/components/os/MediaTasteRadar'), { ssr: false, loading: ChartSkeleton })
const MediaBreakdownSection = dynamic(() => import('@/components/os/MediaBreakdownSection'), { ssr: false, loading: ChartSkeleton })

export function MediaPageClient({ initialEntries }: { initialEntries: MediaEntry[] }) {
  // Same queryKey ('media') MediaWidget already uses internally — TanStack
  // shares one cached fetch across every component subscribed to this key,
  // so this doesn't duplicate MediaWidget's own request.
  const { data } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await fetch('/api/media')
      if (!res.ok) throw new Error('Failed to load media')
      return (await res.json()) as { entries: MediaEntry[] }
    },
    initialData: { entries: initialEntries },
  })
  const entries = data?.entries ?? []

  return (
    <div className="flex flex-col gap-4">
      <ModulePageClient w={10} h={9}>
        <MediaWidget initialEntries={entries} />
      </ModulePageClient>
      <MediaFavouritesShelf entries={entries} />
      <MediaTasteRadar entries={entries} />
      <MediaBreakdownSection entries={entries} />
      <LearningTrackerSection />
    </div>
  )
}
