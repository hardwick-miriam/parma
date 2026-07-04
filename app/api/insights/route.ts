import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getDailyStatsHistory } from '@/lib/db/history'
import { computeInsights } from '@/lib/insights/compute'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Try cached insights first (computed within the last 24h)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: cached } = await supabase
    .from('insights')
    .select('*')
    .eq('user_id', user.id)
    .gte('computed_at', cutoff)
    .order('strength', { ascending: false })

  if (cached && cached.length > 0) {
    return NextResponse.json({ insights: cached, cached: true })
  }

  // Compute fresh
  const history = await getDailyStatsHistory(user.id, 90).catch(() => [])
  if (history.length < 10) {
    return NextResponse.json({ insights: [], insufficient: true })
  }

  const computed = computeInsights(history)

  if (computed.length > 0) {
    // Clear old cache and insert fresh batch
    await supabase.from('insights').delete().eq('user_id', user.id)
    await supabase.from('insights').insert(
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
  }

  return NextResponse.json({ insights: computed, days: history.length })
}
