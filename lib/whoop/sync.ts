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

export interface SyncResult {
  synced: number
  cycles_fetched: number
  recoveries_fetched: number
  sleeps_fetched: number
  skipped_open: number
  upsert_errors: Array<{ date: string; error: string }>
  error?: string
}

function cycleDate(start: string, timezoneOffset: string): string {
  const startMs = new Date(start).getTime()
  const offsetMatch = timezoneOffset.match(/([+-])(\d{2}):(\d{2})/)
  if (!offsetMatch) return new Date(start).toISOString().split('T')[0]
  const sign = offsetMatch[1] === '+' ? 1 : -1
  const offsetMs = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3])) * 60000
  return new Date(startMs + offsetMs).toISOString().split('T')[0]
}

export async function syncWhoopUser(userId: string): Promise<SyncResult> {
  // ── service client ────────────────────────────────────────────────────────────
  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch (err) {
    return {
      synced: 0, cycles_fetched: 0, recoveries_fetched: 0,
      sleeps_fetched: 0, skipped_open: 0, upsert_errors: [],
      error: `Service client unavailable: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // ── valid token ───────────────────────────────────────────────────────────────
  let conn: Awaited<ReturnType<typeof getValidConnectionService>>
  try {
    conn = await getValidConnectionService(userId)
  } catch (err) {
    return {
      synced: 0, cycles_fetched: 0, recoveries_fetched: 0,
      sleeps_fetched: 0, skipped_open: 0, upsert_errors: [],
      error: `Token refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // ── sync window ───────────────────────────────────────────────────────────────
  // First sync (last_sync_at null): backfill 30 days.
  // Subsequent syncs: since last_sync_at minus 1 day to catch late-scored records.
  const { data: connRow } = await supabase
    .from('whoop_connections')
    .select('last_sync_at')
    .eq('user_id', userId)
    .single()

  const lastSync = connRow?.last_sync_at as string | null
  const startDate = lastSync
    ? new Date(new Date(lastSync).getTime() - 86400_000).toISOString()
    : new Date(Date.now() - 30 * 86400_000).toISOString()

  const params = { start: startDate }

  try {
    // ── 1. Pull recoveries ────────────────────────────────────────────────────
    const recoveries = await whoopListAll<WhoopRecoveryRecord>('/recovery', conn.access_token, params)

    // Map cycle_id → recovery, and sleep_id → recovery (for sleep lookup)
    const recoveryByCycle: Record<number, WhoopRecoveryRecord> = {}
    for (const r of recoveries) {
      if (r.score_state === 'SCORED' && r.score) {
        recoveryByCycle[r.cycle_id] = r
      }
    }

    // ── 2. Pull cycles ────────────────────────────────────────────────────────
    const cycles = await whoopListAll<WhoopCycleRecord>('/cycle', conn.access_token, params)

    // ── 3. Pull sleeps ────────────────────────────────────────────────────────
    const sleeps = await whoopListAll<WhoopSleepRecord>('/activity/sleep', conn.access_token, params)

    // Map sleep by ID (not by date — sleep.start is early morning, cycle.start is
    // afternoon; the dates differ so date-matching is wrong).
    // recovery.sleep_id is the authoritative link between a cycle and its sleep.
    const sleepById: Record<number, WhoopSleepRecord> = {}
    for (const s of sleeps) {
      if (!s.nap && s.score_state === 'SCORED' && s.score) {
        sleepById[s.id] = s
      }
    }

    // ── 4. Upsert one row per closed cycle ────────────────────────────────────
    let synced = 0
    let skipped_open = 0
    const upsert_errors: Array<{ date: string; error: string }> = []

    for (const cycle of cycles) {
      if (!cycle.end) {
        skipped_open++
        continue
      }

      const date = cycleDate(cycle.start, cycle.timezone_offset)
      const recovery = recoveryByCycle[cycle.id]
      // Use recovery.sleep_id to find the right sleep record
      const sleep = recovery?.sleep_id ? sleepById[recovery.sleep_id] : undefined

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

      const { error: upsertErr } = await supabase
        .from('whoop_metrics')
        .upsert(row, { onConflict: 'user_id,date' })

      if (upsertErr) {
        upsert_errors.push({
          date,
          error: `[${upsertErr.code}] ${upsertErr.message}${upsertErr.details ? ` — ${upsertErr.details}` : ''}`,
        })
      } else {
        synced++
      }
    }

    // ── 5. Update last_sync_at only if we wrote at least something ─────────────
    if (synced > 0 || cycles.length > 0) {
      await supabase
        .from('whoop_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    return {
      synced,
      cycles_fetched: cycles.length,
      recoveries_fetched: recoveries.length,
      sleeps_fetched: sleeps.length,
      skipped_open,
      upsert_errors,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync error'
    return {
      synced: 0, cycles_fetched: 0, recoveries_fetched: 0,
      sleeps_fetched: 0, skipped_open: 0, upsert_errors: [],
      error: msg,
    }
  }
}

// ── Webhook helpers ───────────────────────────────────────────────────────────

export async function syncRecoveryByCycleId(userId: string, cycleId: number): Promise<void> {
  const conn = await getValidConnectionService(userId)
  const supabase = createServiceClient()

  const recovery = await whoopGet<WhoopRecoveryRecord>(`/recovery/${cycleId}`, conn.access_token)
  if (recovery.score_state !== 'SCORED' || !recovery.score) return

  const cycle = await whoopGet<WhoopCycleRecord>(`/cycle/${cycleId}`, conn.access_token)
  const date = cycleDate(cycle.start, cycle.timezone_offset)

  const sleep = recovery.sleep_id
    ? await whoopGet<WhoopSleepRecord>(`/activity/sleep/${recovery.sleep_id}`, conn.access_token).catch(() => null)
    : null

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
      sleep_performance_pct: (sleep && !sleep.nap && sleep.score_state === 'SCORED')
        ? sleep.score?.sleep_performance_percentage ?? null
        : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
}

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
