import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface WhoopConnection {
  id: string
  user_id: string
  access_token: string
  refresh_token: string
  token_expires_at: string
  whoop_user_id: number | null
  whoop_display_name: string | null
  connected_at: string
  last_sync_at: string | null
}

export interface WhoopMetrics {
  id: string
  user_id: string
  date: string
  cycle_id: number | null
  recovery_score: number | null
  hrv_rmssd_milli: number | null
  resting_hr: number | null
  strain: number | null
  sleep_performance_pct: number | null
}

export async function getWhoopConnection(userId: string): Promise<WhoopConnection | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('whoop_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) console.error('[whoop] getWhoopConnection error:', error.code, error.message)
  return data ?? null
}

export async function upsertWhoopConnection(
  userId: string,
  updates: Partial<Omit<WhoopConnection, 'id' | 'user_id'>>
): Promise<WhoopConnection> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('whoop_connections')
    .upsert({ user_id: userId, ...updates }, { onConflict: 'user_id' })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function deleteWhoopConnection(userId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('whoop_connections').delete().eq('user_id', userId)
  if (error) throw error
}

export async function updateLastSync(userId: string): Promise<void> {
  const supabase = await createClient()
  await supabase
    .from('whoop_connections')
    .update({ last_sync_at: new Date().toISOString() })
    .eq('user_id', userId)
}

export async function upsertWhoopMetrics(
  userId: string,
  date: string,
  metrics: {
    cycle_id?: number
    recovery_score?: number | null
    hrv_rmssd_milli?: number | null
    resting_hr?: number | null
    strain?: number | null
    sleep_performance_pct?: number | null
  }
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('whoop_metrics')
    .upsert(
      { user_id: userId, date, ...metrics, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,date' }
    )
  if (error) console.error('[whoop] upsertWhoopMetrics error:', error.code, error.message)
}

// Returns up to `days` rows ordered newest-first.
// Rows with recovery_score=null are included — callers that need scored data
// should filter with .find(m => m.recovery_score != null).
export async function getWhoopMetrics(
  userId: string,
  days = 7,
  client?: SupabaseClient
): Promise<WhoopMetrics[]> {
  const supabase = client ?? (await createClient())
  const since = new Date(Date.now() - days * 86400_000).toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('whoop_metrics')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since)
    .order('date', { ascending: false })
  if (error) console.error('[whoop] getWhoopMetrics error:', error.code, error.message)
  return data ?? []
}

// Returns the single most-recent row that has a real recovery score.
// Does NOT restrict to today — WHOOP recovery for the current cycle is only
// available after tonight's sleep, so "today's" row is almost always null.
export async function getLatestWhoopMetrics(
  userId: string
): Promise<WhoopMetrics | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('whoop_metrics')
    .select('*')
    .eq('user_id', userId)
    .not('recovery_score', 'is', null)
    .order('date', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) console.error('[whoop] getLatestWhoopMetrics error:', error.code, error.message)
  return data ?? null
}

export async function getWhoopConnectionByWhoopUserId(
  whoopUserId: number
): Promise<WhoopConnection | null> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('whoop_connections')
    .select('*')
    .eq('whoop_user_id', whoopUserId)
    .maybeSingle()
  if (error) console.error('[whoop] getWhoopConnectionByWhoopUserId error:', error.code, error.message)
  return data ?? null
}
