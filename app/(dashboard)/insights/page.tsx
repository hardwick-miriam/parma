export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { InsightsClient } from './InsightsClient'

export default async function InsightsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return <InsightsClient />
}
