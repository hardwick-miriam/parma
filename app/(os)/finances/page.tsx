export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { FinancesClient } from '@/components/os/FinancesClient'

export default async function FinancesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold text-text">Finances</h1>
      <FinancesClient />
    </div>
  )
}
