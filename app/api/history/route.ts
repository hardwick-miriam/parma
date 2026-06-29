import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyStatsHistory } from '@/lib/db/history'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const days = Number(request.nextUrl.searchParams.get('days') ?? '30')
  const clampedDays = Math.max(7, Math.min(days, 180))

  try {
    const history = await getDailyStatsHistory(user.id, clampedDays)
    return NextResponse.json({ history })
  } catch (err) {
    console.error('history error:', err)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
