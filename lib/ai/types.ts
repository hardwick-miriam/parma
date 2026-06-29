export interface ParsedWorkout {
  description: string
  duration_minutes?: number
  feeling?: string
  exercises?: string[]
}

export interface ParsedInjuryCheckin {
  body_part?: string
  feeling_pct: number
  activity?: string
  notes?: string
}

export interface ParsedInjuryResolved {
  body_part?: string
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
  injury_checkin?: ParsedInjuryCheckin
  injury_resolved?: ParsedInjuryResolved
}

export interface AIProvider {
  parseLog(text: string): Promise<ParsedLog>
}
