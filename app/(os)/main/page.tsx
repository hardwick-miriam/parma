export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getBriefing } from '@/lib/db/briefings'
import { getLocalDate } from '@/lib/date'
import { getMainPageData } from '@/lib/pageData/main'
import { MainClient } from '@/components/os/MainClient'
import type { SupabaseClient } from '@supabase/supabase-js'

// getBriefing itself already returns null (no throw) for the genuine "no
// briefing generated yet" case — so anything it does throw is a real
// failure (RLS, connection, etc) and must be logged, not silently folded
// into the same "no briefing yet" fallback the UI shows either way.
async function getBriefingSafe(userId: string, date: string, supabase: SupabaseClient) {
  try {
    return await getBriefing(userId, date, supabase)
  } catch (err) {
    console.error('[main] getBriefing failed:', err)
    return null
  }
}

export default async function MainPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const [data, briefing] = await Promise.all([
    getMainPageData(user.id, supabase),
    getBriefingSafe(user.id, getLocalDate(), supabase),
  ])

  return <MainClient initialData={data} briefing={briefing?.content ?? null} />
}
