export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { MediaWidget } from '@/components/dashboard/widgets/MediaWidget'
import { ModulePageClient } from '@/components/os/ModulePageClient'
import { LearningTrackerSection } from '@/components/os/LearningTrackerSection'

export default async function MediaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Media</h1>
      <ModulePageClient w={10} h={9}>
        <MediaWidget />
      </ModulePageClient>
      <LearningTrackerSection />
    </div>
  )
}
