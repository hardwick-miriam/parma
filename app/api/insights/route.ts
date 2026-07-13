import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyStatsHistory } from '@/lib/db/history'
import { computeInsights, computeMoodCorrelations } from '@/lib/insights/compute'
import { computeMounjaroCorrelations } from '@/lib/insights/mounjaroCompute'
import { getWhoopMetrics } from '@/lib/db/whoop'
import { getRecentWorkouts } from '@/lib/db/queries'
import { getMounjaroDoses, getMounjaroEffects } from '@/lib/db/mounjaro'
import { getUserPreferences } from '@/lib/db/preferences'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try cached insights first (computed within the last 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: cached, error: cacheReadError } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', user.id)
    .gte('computed_at', cutoff)
    .order('strength', { ascending: false })
  if (cacheReadError) console.error('[insights] cache read failed, falling through to recompute:', cacheReadError.message)

  if (cached && cached.length > 0) {
    return NextResponse.json({ insights: cached, cached: true })
  }

  // Compute fresh
  const history = await getDailyStatsHistory(user.id, 90).catch(() => [])
  if (history.length < 10) {
    return NextResponse.json({ insights: [], insufficient: true })
  }

  const [whoopHistory, recentWorkouts] = await Promise.all([
    getWhoopMetrics(user.id, 90, supabase).catch(() => []),
    getRecentWorkouts(user.id, 90, supabase).catch(() => []),
  ])
  const trainedDates = new Set(recentWorkouts.map((w) => w.date))
  const moodCorrelations = computeMoodCorrelations(history, whoopHistory, trainedDates)

  const prefs = await getUserPreferences(user.id, supabase).catch(() => null)
  let mounjaroCorrelations: ReturnType<typeof computeMounjaroCorrelations> = []
  if (prefs?.mounjaro_enabled) {
    const [doses, effects] = await Promise.all([
      getMounjaroDoses(user.id, 90, supabase).catch(() => []),
      getMounjaroEffects(user.id, 90, supabase).catch(() => []),
    ])
    mounjaroCorrelations = computeMounjaroCorrelations(doses, whoopHistory, effects)
  }

  const computed = [...computeInsights(history), ...moodCorrelations, ...mounjaroCorrelations]

  if (computed.length > 0) {
    // Clear old cache and insert fresh batch. If the delete fails, skip the
    // insert entirely rather than risk old+new rows coexisting — a later
    // cache read would otherwise serve a mixed, duplicated set as if it were
    // current. Either error is logged, never silently discarded; failing to
    // cache doesn't block returning the freshly computed insights below.
    const { error: deleteError } = await supabase.from('insights').delete().eq('user_id', user.id)
    if (deleteError) {
      console.error('[insights] failed to clear old cache, skipping re-cache this round:', deleteError.message)
    } else {
      const { error: insertError } = await supabase.from('insights').insert(
        computed.map((ins) => ({
          user_id: user.id,
          type: ins.type,
          metric_a: ins.metric_a ?? null,
          metric_b: ins.metric_b ?? null,
          title: ins.title,
          body: ins.body,
          strength: ins.strength,
          computed_at: new Date().toISOString(),
        }))
      )
      if (insertError) console.error('[insights] failed to write fresh cache:', insertError.message)
    }
  }

  return NextResponse.json({ insights: computed, days: history.length })
}
