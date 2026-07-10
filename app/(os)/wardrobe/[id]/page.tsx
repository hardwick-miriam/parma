export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { ItemDetailClient } from './ItemDetailClient'

export default async function WardrobeItemPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return <div className="max-w-2xl mx-auto"><ItemDetailClient id={id} /></div>
}
