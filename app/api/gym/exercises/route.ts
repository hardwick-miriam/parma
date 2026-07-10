import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchExercises } from '@/lib/exerciseDb'
import { getRecentExerciseNames } from '@/lib/db/workoutSets'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const q = request.nextUrl.searchParams.get('q') ?? ''
  const recent = await getRecentExerciseNames(user.id, 20, supabase).catch(() => [])

  if (!q.trim()) {
    // No query — recent-first, nothing else (avoids dumping all 873 names).
    return NextResponse.json({ names: recent })
  }

  const matches = searchExercises(q, 25).map((e) => e.name)
  const recentSet = new Set(recent.map((n) => n.toLowerCase()))
  // Recent-first: names the user has actually done, in matching order, then the rest.
  const boosted = [
    ...matches.filter((n) => recentSet.has(n.toLowerCase())),
    ...matches.filter((n) => !recentSet.has(n.toLowerCase())),
  ]

  return NextResponse.json({ names: boosted })
}
