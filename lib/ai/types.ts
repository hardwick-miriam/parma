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
  status?: 'want-to' | 'in-progress' | 'finished'
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
  log_date?: string      // YYYY-MM-DD — when the entry belongs to a past/future date
  estimates?: string[]   // field names that are AI-inferred estimates (not stated by user)
}

export interface InjuryContext {
  id: string
  description: string
  body_part: string | null
}

export interface ParseContext {
  activeInjuries?: InjuryContext[]
  today?: string      // YYYY-MM-DD in user's timezone
  timezone?: string   // IANA tz name, e.g. 'Europe/London'
  weekday?: string    // e.g. 'Monday' for relative-day resolution
}

export interface AIProvider {
  parseLog(text: string, context?: ParseContext): Promise<ParsedLog>
}
