import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { DailyStats } from './queries'

export async function getDailyStatsHistory(
  userId: string,
  days: number = 30
): Promise<DailyStats[]> {
  const supabase = await createClient()
  return getDailyStatsHistoryForUser(supabase, userId, days)
}

export async function getDailyStatsHistoryForUser(
  supabase: SupabaseClient,
  userId: string,
  days: number = 30
): Promise<DailyStats[]> {
  const since = new Date()
  since.setDate(since.getDate() - (days - 1))
  const sinceStr = since.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .gte('date', sinceStr)
    .order('date', { ascending: true })

  if (error) throw error
  return (data as DailyStats[]) ?? []
}
