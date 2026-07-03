import { createServiceClient } from '@/lib/supabase/service'
import { getValidConnectionService, whoopListAll, whoopGet } from './client'

interface WhoopRecoveryRecord {
  cycle_id: number
  sleep_id: number
  user_id: number
  created_at: string
  updated_at: string
  score_state: string
  score?: {
    user_calibrating: boolean
    recovery_score: number
    resting_heart_rate: number
    hrv_rmssd_milli: number
    spo2_percentage?: number
    skin_temp_celsius?: number
  }
}

interface WhoopCycleRecord {
  id: number
  user_id: number
  created_at: string
  updated_at: string
  start: string
  end?: string
  timezone_offset: string
  score_state: string
  score?: {
    strain: number
    kilojoule: number
    average_heart_rate: number
    max_heart_rate: number
  }
}

interface WhoopSleepRecord {
  id: number
  user_id: number
  created_at: string
  updated_at: string
  start: string
  end: string
  timezone_offset: string
  nap: boolean
  score_state: string
  score?: {
    sleep_performance_percentage: number
    sleep_consistency_percentage: number
    sleep_efficiency_percentage: number
  }
}

function cycleDate(start: string, timezoneOffset: string): string {
  // Parse the start time and apply timezone offset to get local date
  const startMs = new Date(start).getTime()
  const offsetMatch = timezoneOffset.match(/([+-])(\d{2}):(\d{2})/)
  if (!offsetMatch) return new Date(start).toISOString().split('T')[0]
  const sign = offsetMatch[1] === '+' ? 1 : -1
  const offsetMs = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3])) * 60000
  return new Date(startMs + offsetMs).toISOString().split('T')[0]
}

export async function syncWhoopUser(userId: string): Promise<{ synced: number; error?: string }> {
  const supabase = createServiceClient()

  let conn: Awaited<ReturnType<typeof getValidConnectionService>>
  try {
    conn = await getValidConnectionService(userId)
  } catch {
    return { synced: 0, error: 'Not connected or token refresh failed' }
  }

  // Determine sync window: since last sync - 1 day, or last 14 days
  const { data: connRow } = await supabase
    .from('whoop_connections')
    .select('last_sync_at')
    .eq('user_id', userId)
    .single()

  const lastSync = connRow?.last_sync_at as string | null
  const startDate = lastSync
    ? new Date(new Date(lastSync).getTime() - 86400_000).toISOString()
    : new Date(Date.now() - 14 * 86400_000).toISOString()

  const params = { start: startDate }
  let synced = 0

  try {
    // 1. Pull recoveries (contains hrv, rhr, recovery_score)
    const recoveries = await whoopListAll<WhoopRecoveryRecord>('/recovery', conn.access_token, params)

    // Build map cycle_id → recovery
    const recoveryByCycle: Record<number, WhoopRecoveryRecord> = {}
    for (const r of recoveries) {
      if (r.score_state === 'SCORED' && r.score) {
        recoveryByCycle[r.cycle_id] = r
      }
    }

    // 2. Pull cycles (contains strain and dates)
    const cycles = await whoopListAll<WhoopCycleRecord>('/cycle', conn.access_token, params)

    // 3. Pull non-nap sleeps (contains sleep_performance)
    const sleeps = await whoopListAll<WhoopSleepRecord>('/activity/sleep', conn.access_token, params)

    // Build map: roughly match sleep to cycle by date
    const sleepByDate: Record<string, WhoopSleepRecord> = {}
    for (const s of sleeps) {
      if (!s.nap && s.score_state === 'SCORED' && s.score) {
        const d = cycleDate(s.start, s.timezone_offset)
        sleepByDate[d] = s
      }
    }

    // Upsert one row per cycle
    for (const cycle of cycles) {
      if (!cycle.end) continue // skip open cycles
      const date = cycleDate(cycle.start, cycle.timezone_offset)
      const recovery = recoveryByCycle[cycle.id]
      const sleep = sleepByDate[date]

      const row: Record<string, unknown> = {
        user_id: userId,
        date,
        cycle_id: cycle.id,
        updated_at: new Date().toISOString(),
      }

      if (recovery?.score) {
        row.recovery_score = recovery.score.recovery_score
        row.hrv_rmssd_milli = recovery.score.hrv_rmssd_milli
        row.resting_hr = recovery.score.resting_heart_rate
      }

      if (cycle.score_state === 'SCORED' && cycle.score) {
        row.strain = cycle.score.strain
      }

      if (sleep?.score) {
        row.sleep_performance_pct = sleep.score.sleep_performance_percentage
      }

      await supabase
        .from('whoop_metrics')
        .upsert(row, { onConflict: 'user_id,date' })

      synced++
    }

    // Update last_sync_at
    await supabase
      .from('whoop_connections')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', userId)

    return { synced }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync error'
    return { synced, error: msg }
  }
}

// Sync a single recovery by cycle_id (used by webhook)
export async function syncRecoveryByCycleId(userId: string, cycleId: number): Promise<void> {
  const conn = await getValidConnectionService(userId)
  const supabase = createServiceClient()

  const recovery = await whoopGet<WhoopRecoveryRecord>(`/recovery/${cycleId}`, conn.access_token)
  if (recovery.score_state !== 'SCORED' || !recovery.score) return

  // Get cycle for date and strain
  const cycle = await whoopGet<WhoopCycleRecord>(`/cycle/${cycleId}`, conn.access_token)
  const date = cycleDate(cycle.start, cycle.timezone_offset)

  await supabase
    .from('whoop_metrics')
    .upsert({
      user_id: userId,
      date,
      cycle_id: cycleId,
      recovery_score: recovery.score.recovery_score,
      hrv_rmssd_milli: recovery.score.hrv_rmssd_milli,
      resting_hr: recovery.score.resting_heart_rate,
      strain: cycle.score?.strain ?? null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
}

// Sync a single sleep by sleep_id (used by webhook)
export async function syncSleepById(userId: string, sleepId: number): Promise<void> {
  const conn = await getValidConnectionService(userId)
  const supabase = createServiceClient()

  const sleep = await whoopGet<WhoopSleepRecord>(`/activity/sleep/${sleepId}`, conn.access_token)
  if (sleep.nap || sleep.score_state !== 'SCORED' || !sleep.score) return

  const date = cycleDate(sleep.start, sleep.timezone_offset)

  await supabase
    .from('whoop_metrics')
    .upsert({
      user_id: userId,
      date,
      sleep_performance_pct: sleep.score.sleep_performance_percentage,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
}
