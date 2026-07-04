-- Migration 006: WHOOP workout IDs are UUIDs (TEXT), not BIGINTs
-- Drop the constraint, retype the column, re-add the constraint.
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_user_whoop_id_key;

ALTER TABLE public.workout_sessions
  ALTER COLUMN whoop_id TYPE TEXT USING whoop_id::TEXT;

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_user_whoop_id_key UNIQUE (user_id, whoop_id);
