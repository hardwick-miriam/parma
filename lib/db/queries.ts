import { createClient } from '@/lib/supabase/server'
import type { ParsedLog } from '@/lib/ai/types'

export interface DailyStats {
  id: string
  user_id: string
  date: string
  calories: number
  protein_g: number
  steps: number
  water_ml: number
  mood: string | null
  sleep_hours: number | null
  notes: string | null
  weight_kg: number | null
  supplements: string[] | null
  habits_done: string[] | null
}

export interface WorkoutSession {
  id: string
  user_id: string
  date: string
  created_at: string
  description: string
  duration_minutes: number | null
  feeling: string | null
  exercises: string[] | null
}

export interface HealthStatus {
  user_id: string
  sick: boolean
  sick_since: string | null
  sick_estimated_days: number | null
  injured: boolean
  injury_since: string | null
  injury_description: string | null
  injury_estimated_days: number | null
  updated_at: string
}

export async function getTodayStats(userId: string): Promise<DailyStats | null> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_stats')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getTodayWorkouts(userId: string): Promise<WorkoutSession[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('date', today)
    .order('created_at', { ascending: true })

  if (error) throw error
  return data ?? []
}

export async function getRecentWorkouts(userId: string, days = 30): Promise<WorkoutSession[]> {
  const supabase = await createClient()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('date', since.toISOString().split('T')[0])
    .order('created_at', { ascending: false })

  if (error) throw error
  return data ?? []
}

export async function getHealthStatus(userId: string): Promise<HealthStatus | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('health_status')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertDailyStats(
  userId: string,
  updates: Partial<Omit<DailyStats, 'id' | 'user_id' | 'date'>>
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_stats')
    .select('calories, protein_g, steps, water_ml, supplements, habits_done')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  // Additive: calories, protein, water
  // Max: steps
  // Union: supplements, habits_done
  // Overwrite: mood, sleep_hours, weight_kg, notes
  const merged: Record<string, unknown> = {
    user_id: userId,
    date: today,
    calories: (existing?.calories ?? 0) + (updates.calories ?? 0),
    protein_g: (existing?.protein_g ?? 0) + (updates.protein_g ?? 0),
    steps: updates.steps != null
      ? Math.max(existing?.steps ?? 0, updates.steps)
      : (existing?.steps ?? 0),
    water_ml: (existing?.water_ml ?? 0) + (updates.water_ml ?? 0),
  }

  if (updates.mood != null) merged.mood = updates.mood
  if (updates.sleep_hours != null) merged.sleep_hours = updates.sleep_hours
  if (updates.weight_kg != null) merged.weight_kg = updates.weight_kg
  if (updates.notes != null) merged.notes = updates.notes

  if (updates.supplements?.length) {
    const existing_sups = existing?.supplements ?? []
    merged.supplements = Array.from(new Set([...existing_sups, ...updates.supplements]))
  }

  if (updates.habits_done?.length) {
    const existing_habits = existing?.habits_done ?? []
    merged.habits_done = Array.from(new Set([...existing_habits, ...updates.habits_done]))
  }

  const { error } = await supabase
    .from('daily_stats')
    .upsert(merged, { onConflict: 'user_id,date' })

  if (error) throw error
}

export async function upsertHealthStatus(
  userId: string,
  updates: {
    sick?: boolean
    sick_estimated_days?: number
    injured?: boolean
    injury_description?: string
    injury_estimated_days?: number
  }
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('health_status')
    .select('sick, sick_since, injured, injury_since')
    .eq('user_id', userId)
    .maybeSingle()

  const row: Record<string, unknown> = {
    user_id: userId,
    updated_at: new Date().toISOString(),
  }

  if (updates.sick !== undefined) {
    row.sick = updates.sick
    if (updates.sick && !existing?.sick_since) {
      row.sick_since = today
    } else if (!updates.sick) {
      row.sick_since = null
      row.sick_estimated_days = null
    }
    if (updates.sick && updates.sick_estimated_days != null) {
      row.sick_estimated_days = updates.sick_estimated_days
    }
  }

  if (updates.injured !== undefined) {
    row.injured = updates.injured
    if (updates.injured && !existing?.injury_since) {
      row.injury_since = today
    } else if (!updates.injured) {
      row.injury_since = null
      row.injury_description = null
      row.injury_estimated_days = null
    }
    if (updates.injured) {
      if (updates.injury_description != null) row.injury_description = updates.injury_description
      if (updates.injury_estimated_days != null) row.injury_estimated_days = updates.injury_estimated_days
    }
  }

  const { error } = await supabase
    .from('health_status')
    .upsert(row, { onConflict: 'user_id' })

  if (error) throw error
}

export async function insertWorkout(
  userId: string,
  workout: { description: string; duration_minutes?: number; feeling?: string; exercises?: string[] }
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { error } = await supabase.from('workout_sessions').insert({
    user_id: userId,
    date: today,
    description: workout.description,
    duration_minutes: workout.duration_minutes ?? null,
    feeling: workout.feeling ?? null,
    exercises: workout.exercises ?? null,
  })

  if (error) throw error
}

export interface LogEntry {
  id: string
  user_id: string
  raw_text: string
  parsed_json: unknown
  logged_at: string
  created_at?: string
}

export async function insertLogEntry(
  userId: string,
  rawText: string,
  parsedJson: unknown
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('log_entries').insert({
    user_id: userId,
    raw_text: rawText,
    parsed_json: parsedJson,
    logged_at: new Date().toISOString(), // always set so the "today" query can find it
  })
  if (error) throw error
}

export async function getTodayLogEntries(userId: string): Promise<LogEntry[]> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('log_entries')
    // Filter on `date` (always populated via DB default) so entries
    // with NULL logged_at (inserted before this fix) still appear.
    // Also select created_at as a fallback timestamp for those rows.
    .select('id, user_id, raw_text, parsed_json, logged_at, created_at')
    .eq('user_id', userId)
    .eq('date', today)
    .order('logged_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export interface Injury {
  id: string
  user_id: string
  description: string
  body_part: string | null
  started_on: string
  estimated_days: number | null
  resolved_on: string | null
  created_at: string
}

export interface InjuryCheckin {
  id: string
  injury_id: string
  user_id: string
  feeling_pct: number
  activity: string | null
  notes: string | null
  logged_at: string
  date: string
}

export interface InjuryWithCheckins extends Injury {
  checkins: InjuryCheckin[]
}

export async function getActiveInjuries(userId: string): Promise<Injury[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('injuries')
    .select('*')
    .eq('user_id', userId)
    .is('resolved_on', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data ?? []
}

export async function createInjury(
  userId: string,
  description: string,
  bodyPart: string | null,
  estimatedDays: number | null
): Promise<Injury> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('injuries')
    .insert({ user_id: userId, description, body_part: bodyPart, estimated_days: estimatedDays })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function insertInjuryCheckin(
  injuryId: string,
  userId: string,
  feelingPct: number,
  activity: string | null,
  notes: string | null
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.from('injury_checkins').insert({
    injury_id: injuryId,
    user_id: userId,
    feeling_pct: feelingPct,
    activity,
    notes,
    date: new Date().toISOString().split('T')[0],
  })
  if (error) throw error
}

export async function recomputeDailyStats(userId: string, date: string): Promise<void> {
  const supabase = await createClient()

  const { data: entries } = await supabase
    .from('log_entries')
    .select('parsed_json')
    .eq('user_id', userId)
    .gte('logged_at', `${date}T00:00:00`)
    .lte('logged_at', `${date}T23:59:59.999`)
    .order('logged_at', { ascending: true })

  let calories = 0, protein_g = 0, steps = 0, water_ml = 0
  let mood: string | null = null
  let sleep_hours: number | null = null
  let weight_kg: number | null = null
  let notes: string | null = null
  const supplements = new Set<string>()
  const habits_done = new Set<string>()

  for (const entry of entries ?? []) {
    const p = entry.parsed_json as ParsedLog
    if (p.calories) calories += p.calories
    if (p.protein_g) protein_g += p.protein_g
    if (p.steps != null) steps = Math.max(steps, p.steps)
    if (p.water_ml) water_ml += p.water_ml
    if (p.mood) mood = p.mood
    if (p.sleep_hours != null) sleep_hours = p.sleep_hours
    if (p.weight_kg != null) weight_kg = p.weight_kg
    if (p.notes) notes = p.notes
    p.supplements?.forEach((s) => supplements.add(s))
    p.habits_done?.forEach((h) => habits_done.add(h))
  }

  await supabase.from('daily_stats').upsert(
    {
      user_id: userId,
      date,
      calories,
      protein_g,
      steps,
      water_ml,
      mood,
      sleep_hours,
      weight_kg,
      notes,
      supplements: supplements.size > 0 ? [...supplements] : null,
      habits_done: habits_done.size > 0 ? [...habits_done] : null,
    },
    { onConflict: 'user_id,date' }
  )
}

export async function deleteLogEntryById(
  userId: string,
  entryId: string
): Promise<{ date: string } | null> {
  const supabase = await createClient()
  const { data: entry } = await supabase
    .from('log_entries')
    .select('logged_at')
    .eq('id', entryId)
    .eq('user_id', userId)
    .maybeSingle()
  if (!entry) return null
  const { error } = await supabase
    .from('log_entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)
  if (error) throw error
  return { date: entry.logged_at.split('T')[0] }
}

export async function deleteWorkoutById(userId: string, workoutId: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('workout_sessions')
    .delete()
    .eq('id', workoutId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function deleteInjuryCheckinById(
  userId: string,
  checkinId: string
): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase
    .from('injury_checkins')
    .delete()
    .eq('id', checkinId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function removeSupplementFromToday(
  userId: string,
  supplement: string
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_stats')
    .select('supplements')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()
  const updated = (data?.supplements ?? []).filter(
    (s: string) => s.toLowerCase() !== supplement.toLowerCase()
  )
  await supabase
    .from('daily_stats')
    .update({ supplements: updated.length > 0 ? updated : null })
    .eq('user_id', userId)
    .eq('date', today)
}

export async function removeHabitFromToday(userId: string, habit: string): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { data } = await supabase
    .from('daily_stats')
    .select('habits_done')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()
  const updated = (data?.habits_done ?? []).filter(
    (h: string) => h.toLowerCase() !== habit.toLowerCase()
  )
  await supabase
    .from('daily_stats')
    .update({ habits_done: updated.length > 0 ? updated : null })
    .eq('user_id', userId)
    .eq('date', today)
}

export async function resolveInjuryById(userId: string, injuryId: string): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const { error } = await supabase
    .from('injuries')
    .update({ resolved_on: today })
    .eq('id', injuryId)
    .eq('user_id', userId)
  if (error) throw error
}

export async function getInjuriesWithCheckins(userId: string): Promise<InjuryWithCheckins[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('injuries')
    .select('*, checkins:injury_checkins(*)')
    .eq('user_id', userId)
    .is('resolved_on', null)
    .order('created_at', { ascending: true })
  if (error) throw error
  return (data ?? []).map((inj) => ({
    ...inj,
    checkins: ((inj.checkins ?? []) as InjuryCheckin[]).sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    ),
  }))
}

export async function getResolvedInjuriesWithCheckins(
  userId: string
): Promise<InjuryWithCheckins[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('injuries')
    .select('*, checkins:injury_checkins(*)')
    .eq('user_id', userId)
    .not('resolved_on', 'is', null)
    .order('resolved_on', { ascending: false })
  if (error) throw error
  return (data ?? []).map((inj) => ({
    ...inj,
    checkins: ((inj.checkins ?? []) as InjuryCheckin[]).sort(
      (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    ),
  }))
}
