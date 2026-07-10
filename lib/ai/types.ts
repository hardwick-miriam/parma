import type { z } from 'zod'
import type {
  ParsedWorkoutSchema,
  ParsedInjuryCheckinSchema,
  ParsedInjuryResolvedSchema,
  ParsedMediaItemSchema,
  ParsedLogSchema,
} from '@/lib/schemas'

// Derived from the zod schemas in lib/schemas.ts (the single source of
// truth for the parsed-log shape) instead of being hand-maintained here —
// previously these were two independent declarations of the same shape
// with nothing enforcing they stay in sync. A field added to one without
// the other would silently type-check while being functionally absent.
export type ParsedWorkout = z.infer<typeof ParsedWorkoutSchema>
export type ParsedInjuryCheckin = z.infer<typeof ParsedInjuryCheckinSchema>
export type ParsedInjuryResolved = z.infer<typeof ParsedInjuryResolvedSchema>
export type ParsedMediaItem = z.infer<typeof ParsedMediaItemSchema>
export type ParsedLog = z.infer<typeof ParsedLogSchema>

export interface InjuryContext {
  id: string
  description: string
  body_part: string | null
}

export interface ParseContext {
  activeInjuries?: InjuryContext[]
  today?: string         // YYYY-MM-DD in user's timezone
  timezone?: string      // IANA tz name, e.g. 'Europe/London'
  weekday?: string       // e.g. 'Monday' for relative-day resolution
  resolvedDate?: string  // YYYY-MM-DD pre-resolved by chrono-node — AI should use this as log_date
  currentHour?: number   // 0-23 in user's timezone — used for the post-midnight "yesterday's dinner" heuristic (F2)
}

export interface AIProvider {
  parseLog(text: string, context?: ParseContext): Promise<ParsedLog>
}
