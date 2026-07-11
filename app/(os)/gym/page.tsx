export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getGymPageData } from '@/lib/pageData/gym'
import { GymClient } from '@/components/os/GymClient'

export default async function GymPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const data = await getGymPageData(user.id, supabase)

  return <GymClient initialData={data} />
}
