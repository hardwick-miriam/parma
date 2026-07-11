import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getHealthPageData } from '@/lib/pageData/health'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getHealthPageData(user.id, supabase)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[health-summary] GET error:', err)
    return NextResponse.json({ error: 'Failed to load Health summary' }, { status: 500 })
  }
}
