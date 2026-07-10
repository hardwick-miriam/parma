import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOrCreateTodaySession, getSessionSets } from '@/lib/db/workoutSets'

export const dynamic = 'force-dynamic'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const sessionId = await getOrCreateTodaySession(user.id, supabase)
    const sets = await getSessionSets(user.id, sessionId, supabase)
    return NextResponse.json({ sessionId, sets })
  } catch (err) {
    console.error('[gym/session] error:', err)
    return NextResponse.json({ error: 'Failed to start session' }, { status: 500 })
  }
}
