import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'
import { getDailyStatsHistoryForUser } from '@/lib/db/history'
import { computeInsights, computeMoodCorrelations } from '@/lib/insights/compute'
import { computeMounjaroCorrelations } from '@/lib/insights/mounjaroCompute'
import { getWhoopMetrics } from '@/lib/db/whoop'
import { getRecentWorkouts } from '@/lib/db/queries'
import { getMounjaroDoses, getMounjaroEffects } from '@/lib/db/mounjaro'
import { getUserPreferences } from '@/lib/db/preferences'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()

  // Get all users who have logged at least 10 days of data in the last 90 days
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  const { data: activeUsers, error: activeUsersErr } = await supabase
    .from('daily_stats')
    .select('user_id')
    .gte('date', since)

  if (activeUsersErr) {
    console.error('insights-refresh: failed to list active users:', activeUsersErr.message)
    return NextResponse.json({ error: 'Failed to list active users', refreshed: 0 }, { status: 500 })
  }
  if (!activeUsers?.length) return NextResponse.json({ refreshed: 0 })

  const userIds = [...new Set(activeUsers.map((r: { user_id: string }) => r.user_id))]
  let refreshed = 0
  const failures: Array<{ user_id: string; error: string }> = []

  for (const userId of userIds) {
    try {
      const history = await getDailyStatsHistoryForUser(supabase, userId, 90)
      if (history.length < 10) continue

      const [whoopHistory, recentWorkouts] = await Promise.all([
        getWhoopMetrics(userId, 90, supabase),
        getRecentWorkouts(userId, 90, supabase).catch(() => []),
      ])
      const trainedDates = new Set(recentWorkouts.map((w) => w.date))
      const moodCorrelations = computeMoodCorrelations(history, whoopHistory, trainedDates)

      const prefs = await getUserPreferences(userId, supabase).catch(() => null)
      let mounjaroCorrelations: ReturnType<typeof computeMounjaroCorrelations> = []
      if (prefs?.mounjaro_enabled) {
        const [doses, effects] = await Promise.all([
          getMounjaroDoses(userId, 90, supabase).catch(() => []),
          getMounjaroEffects(userId, 90, supabase).catch(() => []),
        ])
        mounjaroCorrelations = computeMounjaroCorrelations(doses, whoopHistory, effects)
      }

      const computed = [...computeInsights(history), ...moodCorrelations, ...mounjaroCorrelations]
      if (computed.length === 0) continue

      const { error: deleteErr } = await supabase.from('insights').delete().eq('user_id', userId)
      if (deleteErr) throw deleteErr

      const { error: insertErr } = await supabase.from('insights').insert(
        computed.map((ins) => ({
          user_id: userId,
          type: ins.type,
          metric_a: ins.metric_a ?? null,
          metric_b: ins.metric_b ?? null,
          title: ins.title,
          body: ins.body,
          strength: ins.strength,
          computed_at: new Date().toISOString(),
        }))
      )
      if (insertErr) throw insertErr

      // Only counted once the delete+insert are both confirmed to have
      // actually succeeded — previously this incremented unconditionally,
      // regardless of whether the write worked.
      refreshed++
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      console.error(`insights-refresh failed for user ${userId}:`, msg)
      failures.push({ user_id: userId, error: msg })
    }
  }

  return NextResponse.json({ refreshed, total_users: userIds.length, failures })
}
