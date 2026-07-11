import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getBodyPageData } from '@/lib/pageData/body'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const data = await getBodyPageData(user.id, supabase)
    return NextResponse.json(data)
  } catch (err) {
    console.error('[body-summary] GET error:', err)
    return NextResponse.json({ error: 'Failed to load Body summary' }, { status: 500 })
  }
}
