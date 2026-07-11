import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getGymPageData } from '@/lib/pageData/gym'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getGymPageData(user.id, supabase)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[gym-summary] GET error:', err)
    return NextResponse.json({ error: 'Failed to load Gym summary' }, { status: 500 })
  }
}
