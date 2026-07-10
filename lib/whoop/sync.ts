import { createServiceClient } from '@/lib/supabase/service'
import { getValidConnectionService, whoopListAll, whoopGet } from './client'
import { matchRoutineSession } from '@/lib/routineParser'
import type { RoutineSession } from '@/lib/routineParser'

interface WhoopRecoveryRecord {
  cycle_id: number
  sleep_id: string   // WHOOP sleep IDs are UUIDs
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
  id: string   // WHOOP sleep IDs are UUIDs
  user_id: number
  created_at: string
  updated_at: string
  start: string
  end: string
  timezone_offset: string
  nap: boolean
  score_state: string
  score?: {
    stage_summary?: {
      total_in_bed_time_milli: number
      total_awake_time_milli: number
      total_no_data_time_milli: number
      total_light_sleep_time_milli: number
      total_slow_wave_sleep_time_milli: number
      total_rem_sleep_time_milli: number
    }
    sleep_performance_percentage: number
    sleep_consistency_percentage: number
    sleep_efficiency_percentage: number
  }
}

interface WhoopWorkoutRecord {
  id: string   // WHOOP workout IDs are UUIDs, not integers
  user_id: number
  created_at: string
  updated_at: string
  start: string
  end: string
  timezone_offset: string
  sport_id: number
  score_state: string
  score?: {
    strain: number
    average_heart_rate: number
    max_heart_rate: number
    kilojoule: number
    percent_recorded: number
    distance_meter?: number
  }
}

// Common WHOOP sport IDs — unknown IDs fall back to "WHOOP Workout"
const SPORT_NAMES: Record<number, string> = {
  [-1]: 'Activity',
  0: 'Running',
  1: 'Cycling',
  16: 'Weightlifting',
  44: 'Functional Fitness',
  45: 'CrossFit',
  63: 'HIIT',
  71: 'Boxing',
  72: 'Swimming',
  73: 'Triathlon',
  74: 'Duathlon',
  82: 'Walking',
  91: 'Outdoor Biking',
  119: 'Rowing',
  126: 'Yoga',
  149: 'Pilates',
  151: 'Jiu Jitsu',
  167: 'Tennis',
  172: 'Basketball',
  206: 'Football',
  209: 'Soccer',
}

export interface SyncResult {
  synced: number
  workouts_synced: number
  sleeps_synced: number
  cycles_fetched: number
  recoveries_fetched: number
  sleeps_fetched: number
  workouts_fetched: number
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

function sleepHoursFromScore(score: WhoopSleepRecord['score']): number | null {
  if (!score?.stage_summary) return null
  const { total_in_bed_time_milli, total_awake_time_milli, total_no_data_time_milli } = score.stage_summary
  const sleepMs = total_in_bed_time_milli - total_awake_time_milli - (total_no_data_time_milli ?? 0)
  if (sleepMs <= 0) return null
  return Math.round(sleepMs / 360_000) / 10  // round to 1 decimal
}

export async function syncWhoopUser(userId: string): Promise<SyncResult> {
  // ── service client ────────────────────────────────────────────────────────────
  let supabase: ReturnType<typeof createServiceClient>
  try {
    supabase = createServiceClient()
  } catch (err) {
    return {
      synced: 0, workouts_synced: 0, sleeps_synced: 0,
      cycles_fetched: 0, recoveries_fetched: 0, sleeps_fetched: 0, workouts_fetched: 0,
      skipped_open: 0, upsert_errors: [],
      error: `Service client unavailable: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // ── valid token ───────────────────────────────────────────────────────────────
  let conn: Awaited<ReturnType<typeof getValidConnectionService>>
  try {
    conn = await getValidConnectionService(userId)
  } catch (err) {
    return {
      synced: 0, workouts_synced: 0, sleeps_synced: 0,
      cycles_fetched: 0, recoveries_fetched: 0, sleeps_fetched: 0, workouts_fetched: 0,
      skipped_open: 0, upsert_errors: [],
      error: `Token refresh failed: ${err instanceof Error ? err.message : String(err)}`,
    }
  }

  // ── sync window ───────────────────────────────────────────────────────────────
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

    // sleepById: for whoop_metrics rollup (recovery link)
    const sleepById: Record<string, WhoopSleepRecord> = {}
    for (const s of sleeps) {
      if (!s.nap && s.score_state === 'SCORED' && s.score) {
        sleepById[s.id] = s
      }
    }

    // ── 4. Pull workouts ──────────────────────────────────────────────────────
    const workouts = await whoopListAll<WhoopWorkoutRecord>('/activity/workout', conn.access_token, params)

    // ── 5. Upsert whoop_metrics (one row per closed cycle) ────────────────────
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
      // Link recovery → sleep via sleep_id (NOT date matching — they're on different calendar days)
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

    // ── 6. Write WHOOP workouts → workout_sessions ────────────────────────────
    let workouts_synced = 0

    // Fetch the active routine once for exercise fallback
    let activeSessions: RoutineSession[] = []
    try {
      const { data: activeRoutine } = await supabase
        .from('routines')
        .select('sessions')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      if (activeRoutine?.sessions) {
        activeSessions = activeRoutine.sessions as RoutineSession[]
      }
    } catch { /* non-fatal — fallback stays empty */ }

    for (const workout of workouts) {
      if (!workout.end) continue

      const date = cycleDate(workout.start, workout.timezone_offset)
      const sportName = SPORT_NAMES[workout.sport_id] ?? 'WHOOP Workout'
      const durationMinutes = Math.round(
        (new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60_000
      )

      // Check if a parma log already has exercises for this date
      const { data: existingSession } = await supabase
        .from('workout_sessions')
        .select('exercises')
        .eq('user_id', userId)
        .eq('date', date)
        .neq('source', 'whoop')
        .maybeSingle()

      // If no parma-logged exercises, pull from the active routine
      let exercises: string[] | null = existingSession?.exercises ?? null
      let fromRoutine = false
      if (!exercises?.length && activeSessions.length) {
        const routineSession = matchRoutineSession(activeSessions, date, sportName)
        if (routineSession) {
          exercises = routineSession.exercises.map(e => e.name)
          fromRoutine = true
        }
      }

      const { error: wErr } = await supabase
        .from('workout_sessions')
        .upsert(
          {
            user_id: userId,
            date,
            description: sportName,
            duration_minutes: durationMinutes,
            source: 'whoop',
            whoop_id: workout.id,
            started_at: workout.start,
            ...(exercises?.length ? { exercises, notes: fromRoutine ? 'exercises from routine' : null } : {}),
          },
          { onConflict: 'user_id,whoop_id' }
        )

      if (wErr) {
        upsert_errors.push({
          date,
          error: `[workout ${workout.id}] [${wErr.code}] ${wErr.message}`,
        })
      } else {
        workouts_synced++
      }
    }

    // ── 7. Write non-nap WHOOP sleeps → daily_stats.sleep_hours ──────────────
    // Date = local morning sleep ended (cycleDate on sleep.end).
    // Select-then-update-or-insert to avoid clobbering calories/protein/steps.
    let sleeps_synced = 0

    for (const sleep of sleeps) {
      if (sleep.nap || sleep.score_state !== 'SCORED' || !sleep.score) continue

      const hours = sleepHoursFromScore(sleep.score)
      if (hours == null) continue

      const date = cycleDate(sleep.end, sleep.timezone_offset)

      const { data: existing, error: selectErr } = await supabase
        .from('daily_stats')
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle()

      if (selectErr) {
        upsert_errors.push({ date, error: `[sleep ${sleep.id} select] [${selectErr.code}] ${selectErr.message}` })
        continue
      }

      if (existing) {
        const { error: upErr } = await supabase
          .from('daily_stats')
          .update({
            sleep_hours: hours,
            sleep_source: 'whoop',
            whoop_sleep_id: sleep.id,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('date', date)

        if (upErr) {
          upsert_errors.push({ date, error: `[sleep ${sleep.id} update] [${upErr.code}] ${upErr.message}` })
        } else {
          sleeps_synced++
        }
      } else {
        const { error: insErr } = await supabase
          .from('daily_stats')
          .insert({
            user_id: userId,
            date,
            sleep_hours: hours,
            sleep_source: 'whoop',
            whoop_sleep_id: sleep.id,
          })

        if (insErr) {
          upsert_errors.push({ date, error: `[sleep ${sleep.id} insert] [${insErr.code}] ${insErr.message}` })
        } else {
          sleeps_synced++
        }
      }
    }

    // ── 8. Update last_sync_at only when sync completed without errors ────────
    // Don't advance the window on a partial failure — next sync will retry.
    if (upsert_errors.length === 0 && (synced > 0 || cycles.length > 0 || workouts_synced > 0)) {
      await supabase
        .from('whoop_connections')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('user_id', userId)
    }

    return {
      synced,
      workouts_synced,
      sleeps_synced,
      cycles_fetched: cycles.length,
      recoveries_fetched: recoveries.length,
      sleeps_fetched: sleeps.length,
      workouts_fetched: workouts.length,
      skipped_open,
      upsert_errors,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Sync error'
    return {
      synced: 0, workouts_synced: 0, sleeps_synced: 0,
      cycles_fetched: 0, recoveries_fetched: 0, sleeps_fetched: 0, workouts_fetched: 0,
      skipped_open: 0, upsert_errors: [],
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

  const { error } = await supabase
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
  // C8: without this check a failed write is invisible — the webhook route's
  // try/catch never sees it, so it ACKs 200 and WHOOP never retries.
  if (error) throw error
}

export async function syncSleepById(userId: string, sleepId: string): Promise<void> {
  const conn = await getValidConnectionService(userId)
  const supabase = createServiceClient()

  const sleep = await whoopGet<WhoopSleepRecord>(`/activity/sleep/${sleepId}`, conn.access_token)
  if (sleep.nap || sleep.score_state !== 'SCORED' || !sleep.score) return

  const date = cycleDate(sleep.start, sleep.timezone_offset)

  const { error } = await supabase
    .from('whoop_metrics')
    .upsert({
      user_id: userId,
      date,
      sleep_performance_pct: sleep.score.sleep_performance_percentage,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,date' })
  if (error) throw error
}

export async function syncWorkoutById(userId: string, workoutId: string): Promise<void> {
  const conn = await getValidConnectionService(userId)
  const supabase = createServiceClient()

  const workout = await whoopGet<WhoopWorkoutRecord>(`/activity/workout/${workoutId}`, conn.access_token)
  if (!workout.end) return

  const date = cycleDate(workout.start, workout.timezone_offset)
  const sportName = SPORT_NAMES[workout.sport_id] ?? 'WHOOP Workout'
  const durationMinutes = Math.round(
    (new Date(workout.end).getTime() - new Date(workout.start).getTime()) / 60_000
  )

  const { error } = await supabase
    .from('workout_sessions')
    .upsert(
      {
        user_id: userId,
        date,
        description: sportName,
        duration_minutes: durationMinutes,
        source: 'whoop',
        whoop_id: workout.id,
        started_at: workout.start,
      },
      { onConflict: 'user_id,whoop_id' }
    )
  if (error) throw error
}
