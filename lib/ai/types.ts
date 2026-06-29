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
  weight_kg?: number
  habits_done?: string[]
  sick?: boolean
  sick_estimated_days?: number
  injured?: boolean
  injury_description?: string
  injury_estimated_days?: number
}

export interface AIProvider {
  parseLog(text: string): Promise<ParsedLog>
}
