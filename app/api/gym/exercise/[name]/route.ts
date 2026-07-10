import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getLastTimeTopSet, getExerciseStats, getExerciseTrend, getExerciseHistory } from '@/lib/db/workoutSets'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params
  const exerciseName = decodeURIComponent(name)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const excludeSessionId = request.nextUrl.searchParams.get('excludeSessionId') ?? undefined

  try {
    const [lastTime, stats, trend, history] = await Promise.all([
      getLastTimeTopSet(user.id, exerciseName, excludeSessionId, supabase),
      getExerciseStats(user.id, exerciseName, supabase),
      getExerciseTrend(user.id, exerciseName, 12, supabase),
      getExerciseHistory(user.id, exerciseName, 10, supabase),
    ])
    return NextResponse.json({ lastTime, stats, trend, history })
  } catch (err) {
    console.error('[gym/exercise/:name] error:', err)
    return NextResponse.json({ error: 'Failed to load exercise detail' }, { status: 500 })
  }
}
