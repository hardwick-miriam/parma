export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getMediaLog } from '@/lib/db/media'
import { MediaPageClient } from '@/components/os/MediaPageClient'

export default async function MediaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const entries = await getMediaLog(user.id).catch(() => [])

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Media</h1>
      <MediaPageClient initialEntries={entries} />
    </div>
  )
}
