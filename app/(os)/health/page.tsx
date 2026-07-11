export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getHealthPageData } from '@/lib/pageData/health'
import { HealthClient } from '@/components/os/HealthClient'

export default async function HealthPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const data = await getHealthPageData(user.id, supabase)

  return <HealthClient initialData={data} />
}
