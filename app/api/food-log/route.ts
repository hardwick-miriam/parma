import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import { getFoodLog } from '@/lib/db/food'

export const dynamic = 'force-dynamic'

// F1: itemised food entries for a given day — previously there was no way
// to retrieve what was actually logged, only the aggregate daily total.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date') ?? getLocalDate()

  try {
    const items = await getFoodLog(user.id, date)
    return NextResponse.json({ items })
  } catch (err) {
    console.error('food-log GET error:', err)
    return NextResponse.json({ error: 'Failed to load food log' }, { status: 500 })
  }
}
