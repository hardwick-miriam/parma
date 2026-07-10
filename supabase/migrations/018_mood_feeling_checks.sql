-- M15 (BUGS.md): daily_stats.mood and workout_sessions.feeling had no DB
-- CHECK constraint — the zod enum in lib/schemas.ts was the only thing
-- enforcing valid values, and some write paths bypass zod validation
-- entirely (or did, before C2). Add DB-level constraints as defense in
-- depth, matching the pattern already used for media_log.category/status
-- (002_life_vault.sql, 011_media_status.sql).
--
-- Existing out-of-range rows (if any) would make ADD CONSTRAINT fail —
-- NOT VALID + a separate VALIDATE step lets the constraint apply to new
-- writes immediately without requiring a backfill first.

DO $$ BEGIN
  ALTER TABLE public.daily_stats
    ADD CONSTRAINT daily_stats_mood_check
    CHECK (mood IS NULL OR mood IN ('great', 'good', 'okay', 'low', 'bad'))
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE public.workout_sessions
    ADD CONSTRAINT workout_sessions_feeling_check
    CHECK (feeling IS NULL OR feeling IN ('great', 'good', 'okay', 'tired', 'rough'))
    NOT VALID;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Run these once existing data is confirmed clean (safe to run anytime —
-- a no-op if there's nothing invalid, informative error if there is):
--   ALTER TABLE public.daily_stats VALIDATE CONSTRAINT daily_stats_mood_check;
--   ALTER TABLE public.workout_sessions VALIDATE CONSTRAINT workout_sessions_feeling_check;
