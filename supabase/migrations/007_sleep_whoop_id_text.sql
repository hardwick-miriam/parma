-- Migration 007: WHOOP sleep IDs are also UUIDs (TEXT), not BIGINTs
ALTER TABLE public.daily_stats
  ALTER COLUMN whoop_sleep_id TYPE TEXT USING whoop_sleep_id::TEXT;
