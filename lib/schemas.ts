import { z } from 'zod'

// ── NLP parse output ──────────────────────────────────────────────────────────

export const ParsedWorkoutSchema = z.object({
  description: z.string(),
  // workout_sessions.duration_minutes is `integer` — a fractional value
  // passes without .int() and then fails at insert with an opaque Postgres
  // error instead of a clear validation message.
  duration_minutes: z.number().int().optional(),
  feeling: z.enum(['great', 'good', 'okay', 'tired', 'rough']).optional(),
  exercises: z.array(z.string()).optional(),
})

// F1: one entry per distinct food/meal instead of collapsing a whole day's
// worth of eating into a single calories/protein_g total with no record of
// what was actually eaten or when.
export const ParsedFoodItemSchema = z.object({
  description: z.string(),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  calories: z.number().nonnegative().int(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fibre_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  salt_g: z.number().nonnegative().optional(),
})

// Saved-meal items are re-summed later (quickAddSavedMeal's totals reduce) with
// no downstream default-to-0 step, unlike ParsedFoodItemSchema's optional macros —
// so every macro here is required, not optional, or a missing field becomes NaN
// and silently corrupts that day's daily_stats.
export const SavedMealItemSchema = z.object({
  description: z.string().min(1),
  meal: z.enum(['breakfast', 'lunch', 'dinner', 'snack']).optional(),
  calories: z.number().nonnegative().int(),
  protein_g: z.number().nonnegative(),
  carbs_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fibre_g: z.number().nonnegative(),
  sugar_g: z.number().nonnegative(),
  salt_g: z.number().nonnegative(),
})

// Feature 5: body-part circumference measurements. Value+unit are taken as
// stated (cm assumed, inches only when explicit) and converted to cm at the
// application layer (lib/db/bodyMeasurements.ts:toCm) — never trust the AI's
// own arithmetic for a unit conversion.
export const BodyMeasurementEntrySchema = z.object({
  site: z.enum([
    'chest', 'left_arm', 'right_arm', 'waist', 'hips',
    'left_thigh', 'right_thigh', 'left_calf', 'neck', 'shoulders',
  ]),
  value: z.number().positive(),
  unit: z.enum(['cm', 'inch']).default('cm'),
  note: z.string().optional(),
})

// Feature 20: reading/learning tracker — distinct from ParsedMediaItemSchema
// (films/shows/songs, and a simpler casual book log); this is the typed,
// progress-tracking version for book/course/audiobook/paper.
export const ParsedLearningItemSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['book', 'course', 'audiobook', 'paper']),
  status: z.enum(['want', 'in-progress', 'finished']).optional(),
  progress_pct: z.number().min(0).max(100).optional(),
  rating: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
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
  // Clamped rather than strictly bounded — the tool schema has no numeric
  // bound on this, so an out-of-range value from the model used to fail
  // this whole media item, which cascaded into failing the entire log
  // (M23) even when everything else — food, workouts, etc — was fine.
  rating: z.number().optional().transform((v) => (v == null ? v : Math.min(10, Math.max(1, v)))),
  note: z.string().optional(),
  status: z.enum(['want-to', 'in-progress', 'finished']).optional(),
})

export const MounjaroSideEffectsSchema = z.object({
  // 0 is meaningful here (0=no nausea, 0=no appetite, 0=exhausted — see the
  // tool schema in lib/ai/providers/claude.ts) — min(1) used to reject a
  // legitimate "no side effects" report and fail the entire parsed log.
  nausea: z.number().min(0).max(10).optional(),
  appetite: z.number().min(0).max(10).optional(),
  energy: z.number().min(0).max(10).optional(),
  notes: z.string().optional(),
})

export const MuscleSorenessEntrySchema = z.object({
  muscle_id: z.string(),
  // Same clamp-not-fail reasoning as media rating above (M23).
  intensity: z.number().transform((v) => Math.min(10, Math.max(1, v))),
})

export const ParsedLogSchema = z.object({
  // daily_stats.calories is `integer` — see duration_minutes above for the
  // same class of bug this .int() guards against.
  // Remain the SUM across `foods` when multiple items are present (still
  // what daily_stats additively accumulates) — `foods` is the itemised
  // breakdown, not a replacement for these totals.
  calories: z.number().nonnegative().int().optional(),
  protein_g: z.number().nonnegative().optional(),
  carbs_g: z.number().nonnegative().optional(),
  fat_g: z.number().nonnegative().optional(),
  fibre_g: z.number().nonnegative().optional(),
  sugar_g: z.number().nonnegative().optional(),
  salt_g: z.number().nonnegative().optional(),
  foods: z.array(ParsedFoodItemSchema).optional(),
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
  // Filters out malformed codes instead of failing the whole log on one bad
  // entry (M23) — the tool schema has no length/pattern constraint on this,
  // so a stray 2-letter or misformatted code from the model used to nuke
  // any food/workout/etc bundled in the same message.
  countries_visited: z.array(z.string()).optional().transform((arr) =>
    arr?.map((c) => c.trim().toUpperCase()).filter((c) => /^[A-Z]{3}$/.test(c))
  ),
  world_clock_cities: z.array(z.string()).optional(),
  mounjaro_dose_mg: z.number().positive().optional(),
  mounjaro_feeling: z.string().optional(),
  mounjaro_side_effects: MounjaroSideEffectsSchema.optional(),
  log_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  estimates: z.array(z.string()).optional(),
  muscle_soreness: z.array(MuscleSorenessEntrySchema).optional(),
  body_measurements: z.array(BodyMeasurementEntrySchema).optional(),
  learning_items: z.array(ParsedLearningItemSchema).optional(),
})

export type ParsedLog = z.infer<typeof ParsedLogSchema>

// ── /api/parse-log payload ────────────────────────────────────────────────────

export const ParseLogPayloadSchema = z.object({
  text: z.string().min(1, 'text is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  timezone: z.string().optional(),
  // Soft bias only (e.g. 'food', 'health') — nudges interpretation of ambiguous
  // text toward the module the user is currently in, never a hard restriction.
  moduleContext: z.string().optional(),
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

// ── natural-language search (feature 9) ───────────────────────────────────────
// Intent-parse output for /api/query — translates a free-text question into
// structured parameters for a real, targeted DB query. Never used to answer
// the question directly (no raw rows are ever sent back to the model).
export const ParsedQuestionSchema = z.object({
  intent: z.enum(['exercise_threshold_date', 'rest_day_count', 'food_on_sick_day', 'metric_extreme', 'general_fallback']),
  exercise: z.string().optional(),
  weight_kg: z.number().positive().optional(),
  period_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  period_end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  metric: z.enum(['recovery_score', 'steps', 'sleep_hours', 'calories', 'weight_kg', 'strain', 'hrv']).optional(),
  direction: z.enum(['max', 'min']).optional(),
})
export type ParsedQuestion = z.infer<typeof ParsedQuestionSchema>

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
