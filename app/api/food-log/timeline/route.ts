import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFoodLogTimeline } from '@/lib/db/food'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const before = request.nextUrl.searchParams.get('before') ?? undefined
  const limit = Number(request.nextUrl.searchParams.get('limit')) || 7

  try {
    const result = await getFoodLogTimeline(user.id, { before, limitDays: limit }, supabase)
    return NextResponse.json(result)
  } catch (err) {
    console.error('food-log/timeline GET error:', err)
    return NextResponse.json({ error: 'Failed to load timeline' }, { status: 500 })
  }
}
