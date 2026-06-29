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

export async function upsertDailyStats(
  userId: string,
  updates: Partial<Omit<DailyStats, 'id' | 'user_id' | 'date'>>
): Promise<void> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]

  const { data: existing } = await supabase
    .from('daily_stats')
    .select('calories, protein_g, steps, water_ml')
    .eq('user_id', userId)
    .eq('date', today)
    .maybeSingle()

  const merged = {
    user_id: userId,
    date: today,
    calories: (existing?.calories ?? 0) + (updates.calories ?? 0),
    protein_g: (existing?.protein_g ?? 0) + (updates.protein_g ?? 0),
    steps: updates.steps != null
      ? Math.max(existing?.steps ?? 0, updates.steps)
      : (existing?.steps ?? 0),
    water_ml: (existing?.water_ml ?? 0) + (updates.water_ml ?? 0),
    ...(updates.mood && { mood: updates.mood }),
    ...(updates.sleep_hours != null && { sleep_hours: updates.sleep_hours }),
    ...(updates.notes && { notes: updates.notes }),
  }

  const { error } = await supabase
    .from('daily_stats')
    .upsert(merged, { onConflict: 'user_id,date' })

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
