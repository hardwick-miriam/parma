export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getMediaLog } from '@/lib/db/media'
import { MediaWidget } from '@/components/dashboard/widgets/MediaWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { LearningTrackerSection } from '@/components/os/LearningTrackerSection'

export default async function MediaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const entries = await getMediaLog(user.id).catch(() => [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Media</h1>
      <ModulePageClient w={10} h={9}>
        <MediaWidget initialEntries={entries} />
      </ModulePageClient>
      <LearningTrackerSection />
    </div>
  )
}
