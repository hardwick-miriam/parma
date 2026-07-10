export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { WardrobeClient } from '@/components/wardrobe/WardrobeClient'

export default async function WardrobePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return <div className="max-w-5xl mx-auto"><WardrobeClient /></div>
}
