export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getWardrobeItems } from '@/lib/db/wardrobe'
import { currentSeason } from '@/lib/wardrobeTypes'
import { WardrobeClient } from '@/components/wardrobe/WardrobeClient'

export default async function WardrobePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Matches WardrobeClient's default filter state exactly (current season,
  // no other filters, newest-first) so this can seed the client's first
  // TanStack query instead of it fetching cold on mount.
  const allItems = await getWardrobeItems(user.id, supabase).catch(() => [])
  const season = currentSeason()
  const initialItems = allItems.filter((i) => i.seasons.includes(season))

  return <div className="max-w-5xl mx-auto"><WardrobeClient initialItems={initialItems} initialSeason={season} /></div>
}
