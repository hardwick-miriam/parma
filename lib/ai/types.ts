export interface ParsedWorkout {
  description: string
  duration_minutes?: number
  feeling?: string
  exercises?: string[]
}

export interface ParsedLog {
  calories?: number
  protein_g?: number
  steps?: number
  workouts?: ParsedWorkout[]
  mood?: string
  water_ml?: number
  sleep_hours?: number
  supplements?: string[]
  notes?: string
}

export interface AIProvider {
  parseLog(text: string): Promise<ParsedLog>
}
