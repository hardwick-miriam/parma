import { z } from 'zod'

// ── NLP parse output ──────────────────────────────────────────────────────────

export const ParsedWorkoutSchema = z.object({
  description: z.string(),
  duration_minutes: z.number().optional(),
  feeling: z.enum(['great', 'good', 'okay', 'tired', 'rough']).optional(),
  exercises: z.array(z.string()).optional(),
})

export const ParsedInjuryCheckinSchema = z.object({
  body_part: z.string().optional(),
  feeling_pct: z.number().min(0).max(100),
  activity: z.string().optional(),
  notes: z.string().optional(),
})

export const ParsedInjuryResolvedSchema = z.object({
  body_part: z.string().optional(),
})

export const ParsedMediaItemSchema = z.object({
  category: z.enum(['book', 'film', 'show', 'song']),
  title: z.string(),
  rating: z.number().min(1).max(10).optional(),
  note: z.string().optional(),
  status: z.enum(['want-to', 'in-progress', 'finished']).optional(),
})

export const MounjaroSideEffectsSchema = z.object({
  nausea: z.number().min(1).max(10).optional(),
  appetite: z.number().min(1).max(10).optional(),
  energy: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
})

export const MuscleSorenessEntrySchema = z.object({
  muscle_id: z.string(),
  intensity: z.number().min(1).max(10),
})

export const ParsedLogSchema = z.object({
  calories: z.number().nonnegative().optional(),
  protein_g: z.number().nonnegative().optional(),
  steps: z.number().nonnegative().int().optional(),
  workouts: z.array(ParsedWorkoutSchema).optional(),
  mood: z.enum(['great', 'good', 'okay', 'low', 'bad']).optional(),
  water_ml: z.number().nonnegative().optional(),
  sleep_hours: z.number().nonnegative().optional(),
  supplements: z.array(z.string()).optional(),
  notes: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  habits_done: z.array(z.string()).optional(),
  sick: z.boolean().optional(),
  sick_estimated_days: z.number().nonnegative().int().optional(),
  injured: z.boolean().optional(),
  injury_description: z.string().optional(),
  injury_body_part: z.string().optional(),
  injury_estimated_days: z.number().nonnegative().int().optional(),
  injury_checkin: ParsedInjuryCheckinSchema.optional(),
  injury_resolved: ParsedInjuryResolvedSchema.optional(),
  media: z.array(ParsedMediaItemSchema).optional(),
  countries_visited: z.array(z.string().length(3)).optional(),
  world_clock_cities: z.array(z.string()).optional(),
  mounjaro_dose_mg: z.number().positive().optional(),
  mounjaro_feeling: z.string().optional(),
  mounjaro_side_effects: MounjaroSideEffectsSchema.optional(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimates: z.array(z.string()).optional(),
  muscle_soreness: z.array(MuscleSorenessEntrySchema).optional(),
})

export type ParsedLog = z.infer<typeof ParsedLogSchema>

// ── /api/parse-log payload ────────────────────────────────────────────────────

export const ParseLogPayloadSchema = z.object({
  text: z.string().min(1, 'text is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().optional(),
})

// ── /api/body/soreness payload ────────────────────────────────────────────────

export const SorenessPayloadSchema = z.object({
  entries: z.array(
    z.object({
      muscle_id: z.string().min(1),
      intensity: z.number().min(1).max(10),
      source: z.string().optional(),
    })
  ).min(1, 'entries must not be empty'),
})

// ── /api/routine payload ──────────────────────────────────────────────────────

export const RoutinePostPayloadSchema = z.object({
  text: z.string().min(1, 'text is required'),
  name: z.string().optional(),
})

export const RoutinePutPayloadSchema = z.object({
  name: z.string().optional(),
  sessions: z.array(z.unknown()).optional(),
  is_active: z.boolean().optional(),
})

// ── /api/journal payload ──────────────────────────────────────────────────────

export const JournalPayloadSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  content: z.string().optional(),
})

// ── helpers ───────────────────────────────────────────────────────────────────

export function validateOrThrow<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data)
  if (!result.success) {
    const detail = result.error.flatten()
    console.error(`[zod] ${label} validation failed:`, JSON.stringify(detail))
    throw new Error(`Invalid ${label}: ${JSON.stringify(detail.fieldErrors)}`)
  }
  return result.data
}
