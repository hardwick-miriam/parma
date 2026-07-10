// Client-safe types + pure helpers for the live workout logger. Kept separate
// from lib/db/workoutSets.ts (which imports lib/supabase/server -> next/headers)
// so client components never pull a server-only module into the bundle.

export interface WorkoutSet {
  id: string
  user_id: string
  workout_session_id: string
  exercise_name: string
  weight: number
  reps: number
  is_warmup: boolean
  logged_at: string
}

/** Epley formula — the one config spot for the 1RM estimate used everywhere in the logger. */
export function estimate1RM(weight: number, reps: number): number {
  return Math.round(weight * (1 + reps / 30) * 10) / 10
}
