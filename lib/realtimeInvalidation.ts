// Single source of truth mapping each realtime-watched Postgres table to the
// TanStack Query keys that should be invalidated when it changes. Add a new
// table+key pair here, not a second ad-hoc invalidation path — this is what
// RealtimeSync.tsx reads to decide what to invalidate on a DB change.
//
// A query key appearing here with NO matching useQuery() anywhere is inert
// (invalidateQueries on a key nobody's watching is a harmless no-op) — safe
// to list defensively for keys that will exist once a widget adopts them.
export const TABLE_QUERY_KEYS: Record<string, string[]> = {
  daily_stats: ['food-today', 'main-summary', 'health-summary', 'body-summary', 'gym-summary', 'journal-summary', 'mood-correlations'],
  food_log: ['food-today', 'food-timeline', 'food-most-eaten', 'main-summary'],
  food_notes: ['food-notes'],
  saved_meals: ['saved-meals'],
  workout_sessions: ['gym-session', 'main-summary', 'health-summary', 'body-summary', 'gym-summary', 'journal-summary'],
  workout_sets: ['gym-session', 'gym-exercise-detail', 'gym-summary', 'body-summary', 'personal-records'],
  personal_records: ['personal-records'],
  whoop_metrics: ['main-summary', 'health-summary', 'body-summary', 'mood-correlations', 'mounjaro-due'],
  injuries: ['main-summary', 'health-summary', 'body-summary'],
  injury_checkins: ['main-summary', 'health-summary', 'body-summary'],
  health_status: ['main-summary', 'health-summary'],
  body_measurements: ['body-measurements'],
  learning_items: ['learning-items'],
  finance_accounts: ['finances-summary'],
  finance_debts: ['finances-summary'],
  finance_snapshots: ['finances-summary'],
  mounjaro_doses: ['mounjaro-due', 'mood-correlations'],
  mounjaro_effects: ['mounjaro-due'],
  media_log: ['media'],
  wardrobe_items: ['wardrobe', 'wardrobe-item'],
  wardrobe_wears: ['wardrobe', 'wardrobe-item'],
  journal_notes: ['journal-summary', 'journal-notes'],
  user_preferences: ['main-summary', 'health-summary', 'body-summary', 'gym-summary', 'user-preferences'],
  log_entries: ['main-summary', 'health-summary', 'journal-summary'],
  progress_photos: ['photos'],
  insights: ['mood-correlations', 'insights'],
}

export const WATCHED_TABLES = Object.keys(TABLE_QUERY_KEYS)
