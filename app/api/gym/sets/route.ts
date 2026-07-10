import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { insertSet } from '@/lib/db/workoutSets'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  const { sessionId, exerciseName, weight, reps, isWarmup } = body ?? {}

  if (!sessionId || !exerciseName || typeof weight !== 'number' || typeof reps !== 'number') {
    return NextResponse.json({ error: 'sessionId, exerciseName, weight, reps are required' }, { status: 400 })
  }
  if (weight <= 0 || reps <= 0) {
    return NextResponse.json({ error: 'weight and reps must be positive' }, { status: 400 })
  }

  try {
    const result = await insertSet(user.id, sessionId, exerciseName, weight, reps, !!isWarmup, supabase)
    return NextResponse.json(result)
  } catch (err) {
    console.error('[gym/sets] insert error:', err)
    return NextResponse.json({ error: 'Failed to log set' }, { status: 500 })
  }
}
