export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { getBodyPageData } from '@/lib/pageData/body'
import { BodyClient } from '@/components/os/BodyClient'

export default async function BodyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const data = await getBodyPageData(user.id, supabase)

  return <BodyClient initialData={data} />
}
