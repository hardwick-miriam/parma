import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getMainPageData } from '@/lib/pageData/main'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getMainPageData(user.id, supabase)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[main-summary] GET error:', err)
    return NextResponse.json({ error: 'Failed to load Main summary' }, { status: 500 })
  }
}
