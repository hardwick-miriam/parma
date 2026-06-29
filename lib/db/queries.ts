import { createClient } from '@/lib/supabase/server'

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
