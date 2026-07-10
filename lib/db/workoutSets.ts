import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { getLocalDate } from '@/lib/date'
import type { WorkoutSet } from '@/lib/gymTypes'
import { estimate1RM } from '@/lib/gymTypes'

export type { WorkoutSet } from '@/lib/gymTypes'
export { estimate1RM } from '@/lib/gymTypes'

/**
 * Get today's live-logger session, creating one if it doesn't exist yet.
 * Reuses workout_sessions (not a new table) — one row per day per user with
 * source='live-logger', same table every other logging path already writes to.
 */
export async function getOrCreateTodaySession(userId: string, client?: SupabaseClient): Promise<string> {
  const supabase = client ?? (await createClient())
  const today = getLocalDate()

  const { data: existing, error: findError } = await supabase
    .from('workout_sessions')
    .select('id')
    .eq('user_id', userId)
    .eq('date', today)
    .eq('source', 'live-logger')
    .maybeSingle()
  if (findError) throw findError
  if (existing) return existing.id

  const { data: created, error: createError } = await supabase
    .from('workout_sessions')
    .insert({
      user_id: userId,
      date: today,
      description: 'Live workout',
      source: 'live-logger',
      started_at: new Date().toISOString(),
      exercises: [],
    })
    .select('id')
    .single()
  if (createError) throw createError
  return created.id
}

export async function getSessionSets(
  userId: string,
  sessionId: string,
  client?: SupabaseClient
): Promise<WorkoutSet[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', userId)
    .eq('workout_session_id', sessionId)
    .order('logged_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export interface NewSetResult {
  set: WorkoutSet
  isNewPR: boolean
  prValue: number | null
}

/**
 * Logs a set, appends the exercise name to the session's `exercises` array
 * (so the existing muscle-load/training-load calculations — which read that
 * array — pick it up with zero changes), and updates personal_records only
 * when this set is a genuine new best (never silently downgrades a PR).
 */
export async function insertSet(
  userId: string,
  sessionId: string,
  exerciseName: string,
  weight: number,
  reps: number,
  isWarmup: boolean,
  client?: SupabaseClient
): Promise<NewSetResult> {
  const supabase = client ?? (await createClient())

  const { data: set, error } = await supabase
    .from('workout_sets')
    .insert({
      user_id: userId,
      workout_session_id: sessionId,
      exercise_name: exerciseName,
      weight,
      reps,
      is_warmup: isWarmup,
    })
    .select('*')
    .single()
  if (error) throw error

  // Append to the session's exercises[] if not already present — this is the
  // exact array the existing muscle-load (aggregateExerciseLoads) and
  // training-load (getDayLoad) calculations already consume.
  const { data: session, error: sessionError } = await supabase
    .from('workout_sessions')
    .select('exercises')
    .eq('id', sessionId)
    .single()
  if (sessionError) throw sessionError

  const currentExercises: string[] = session.exercises ?? []
  if (!currentExercises.includes(exerciseName)) {
    const { error: updateError } = await supabase
      .from('workout_sessions')
      .update({ exercises: [...currentExercises, exerciseName] })
      .eq('id', sessionId)
    if (updateError) throw updateError
  }

  let isNewPR = false
  let prValue: number | null = null

  if (!isWarmup) {
    const { data: existingPR, error: prReadError } = await supabase
      .from('personal_records')
      .select('value')
      .eq('user_id', userId)
      .eq('exercise', exerciseName)
      .eq('unit', 'kg')
      .maybeSingle()
    if (prReadError) throw prReadError

    if (!existingPR || weight > existingPR.value) {
      const { error: prWriteError } = await supabase
        .from('personal_records')
        .upsert(
          {
            user_id: userId,
            exercise: exerciseName,
            value: weight,
            unit: 'kg',
            reps,
            logged_at: getLocalDate(),
          },
          { onConflict: 'user_id,exercise,unit' }
        )
      if (prWriteError) throw prWriteError
      isNewPR = true
      prValue = weight
    }
  }

  return { set, isNewPR, prValue }
}

export async function updateSet(
  userId: string,
  setId: string,
  updates: { weight?: number; reps?: number; is_warmup?: boolean },
  client?: SupabaseClient
): Promise<WorkoutSet> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('workout_sets')
    .update(updates)
    .eq('id', setId)
    .eq('user_id', userId)
    .select('*')
    .single()
  if (error) throw error
  return data
}

export async function deleteSet(userId: string, setId: string, client?: SupabaseClient): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase.from('workout_sets').delete().eq('id', setId).eq('user_id', userId)
  if (error) throw error
}

/** The most recent prior session's top (heaviest working) set for this exercise. */
export async function getLastTimeTopSet(
  userId: string,
  exerciseName: string,
  excludeSessionId: string | undefined,
  client?: SupabaseClient
): Promise<WorkoutSet | null> {
  const supabase = client ?? (await createClient())
  let query = supabase
    .from('workout_sets')
    .select('*')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .eq('is_warmup', false)
    .order('logged_at', { ascending: false })
    .limit(50)
  const { data, error } = await query
  if (error) throw error

  const sets = (data ?? []).filter((s) => s.workout_session_id !== excludeSessionId)
  if (!sets.length) return null

  // Most recent session id among remaining sets, then heaviest set within it.
  const mostRecentSessionId = sets[0].workout_session_id
  const sameSession = sets.filter((s) => s.workout_session_id === mostRecentSessionId)
  return sameSession.reduce((best, s) => (s.weight > best.weight ? s : best), sameSession[0])
}

export interface ExerciseStats {
  estimated1RM: number | null
  bestSet: { weight: number; reps: number } | null
  sessionCount: number
}

export async function getExerciseStats(
  userId: string,
  exerciseName: string,
  client?: SupabaseClient
): Promise<ExerciseStats> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, workout_session_id')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .eq('is_warmup', false)
  if (error) throw error

  const sets = data ?? []
  if (!sets.length) return { estimated1RM: null, bestSet: null, sessionCount: 0 }

  const best1RM = Math.max(...sets.map((s) => estimate1RM(s.weight, s.reps)))
  const bestSet = sets.reduce((best, s) => (s.weight > best.weight ? s : best), sets[0])
  const sessionCount = new Set(sets.map((s) => s.workout_session_id)).size

  return {
    estimated1RM: best1RM,
    bestSet: { weight: bestSet.weight, reps: bestSet.reps },
    sessionCount,
  }
}

export interface TrendPoint {
  date: string
  topWeight: number
  estimated1RM: number
}

/** Top set (and its est-1RM) per session, most recent N sessions, oldest-first for charting. */
export async function getExerciseTrend(
  userId: string,
  exerciseName: string,
  limit: number,
  client?: SupabaseClient
): Promise<TrendPoint[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, logged_at, workout_session_id, workout_sessions!inner(date)')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .eq('is_warmup', false)
    .order('logged_at', { ascending: false })
    .limit(500)
  if (error) throw error

  type Row = { weight: number; reps: number; workout_session_id: string; workout_sessions: { date: string } | { date: string }[] }
  const bySession = new Map<string, { date: string; topWeight: number; estimated1RM: number }>()

  for (const row of (data ?? []) as Row[]) {
    const sessionDate = Array.isArray(row.workout_sessions) ? row.workout_sessions[0]?.date : row.workout_sessions?.date
    if (!sessionDate) continue
    const existing = bySession.get(row.workout_session_id)
    const rm = estimate1RM(row.weight, row.reps)
    if (!existing || row.weight > existing.topWeight) {
      bySession.set(row.workout_session_id, {
        date: sessionDate,
        topWeight: row.weight,
        estimated1RM: Math.max(rm, existing?.estimated1RM ?? 0),
      })
    } else if (rm > existing.estimated1RM) {
      existing.estimated1RM = rm
    }
  }

  return Array.from(bySession.values())
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-limit)
}

export interface HistorySession {
  sessionId: string
  date: string
  sets: { weight: number; reps: number; isWarmup: boolean }[]
}

export async function getExerciseHistory(
  userId: string,
  exerciseName: string,
  limit: number,
  client?: SupabaseClient
): Promise<HistorySession[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('workout_sets')
    .select('weight, reps, is_warmup, workout_session_id, workout_sessions!inner(date)')
    .eq('user_id', userId)
    .eq('exercise_name', exerciseName)
    .order('logged_at', { ascending: false })
    .limit(500)
  if (error) throw error

  type Row = { weight: number; reps: number; is_warmup: boolean; workout_session_id: string; workout_sessions: { date: string } | { date: string }[] }
  const bySession = new Map<string, HistorySession>()

  for (const row of (data ?? []) as Row[]) {
    const sessionDate = Array.isArray(row.workout_sessions) ? row.workout_sessions[0]?.date : row.workout_sessions?.date
    if (!sessionDate) continue
    const existing = bySession.get(row.workout_session_id)
    const set = { weight: row.weight, reps: row.reps, isWarmup: row.is_warmup }
    if (existing) existing.sets.push(set)
    else bySession.set(row.workout_session_id, { sessionId: row.workout_session_id, date: sessionDate, sets: [set] })
  }

  return Array.from(bySession.values())
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, limit)
}

/** Distinct exercise names the user has actually logged, most-recent-first, for "recent-first" search ordering. */
export async function getRecentExerciseNames(userId: string, limit = 20, client?: SupabaseClient): Promise<string[]> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('workout_sets')
    .select('exercise_name, logged_at')
    .eq('user_id', userId)
    .order('logged_at', { ascending: false })
    .limit(200)
  if (error) throw error

  const seen = new Set<string>()
  const ordered: string[] = []
  for (const row of data ?? []) {
    if (!seen.has(row.exercise_name)) {
      seen.add(row.exercise_name)
      ordered.push(row.exercise_name)
    }
    if (ordered.length >= limit) break
  }
  return ordered
}
