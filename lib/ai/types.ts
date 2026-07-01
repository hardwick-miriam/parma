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

export interface ParsedMediaItem {
  category: 'book' | 'film' | 'show' | 'song'
  title: string
  rating?: number
  note?: string
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
  injury_body_part?: string
  injury_estimated_days?: number
  injury_checkin?: ParsedInjuryCheckin
  injury_resolved?: ParsedInjuryResolved
  media?: ParsedMediaItem[]
  countries_visited?: string[] // ISO alpha-3 codes
  world_clock_cities?: string[] // city names to add to world clocks widget
  mounjaro_dose_mg?: number
  mounjaro_feeling?: string
  mounjaro_side_effects?: {
    nausea?: number
    appetite?: number
    energy?: number
    notes?: string
  }
}

export interface InjuryContext {
  id: string
  description: string
  body_part: string | null
}

export interface ParseContext {
  activeInjuries?: InjuryContext[]
}

export interface AIProvider {
  parseLog(text: string, context?: ParseContext): Promise<ParsedLog>
}
