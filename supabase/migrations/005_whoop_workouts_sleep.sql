-- Migration 005: WHOOP workout + sleep table integration
-- Run in Supabase SQL Editor (select all → Run).

-- ── workout_sessions: track source and WHOOP workout id ──────────────────────
ALTER TABLE public.workout_sessions
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS whoop_id BIGINT,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- Prevent duplicate WHOOP workouts on re-sync.
-- NULLs are distinct in Postgres unique constraints, so manual workouts
-- (whoop_id IS NULL) are never blocked by this constraint.
ALTER TABLE public.workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_user_whoop_id_key;

ALTER TABLE public.workout_sessions
  ADD CONSTRAINT workout_sessions_user_whoop_id_key UNIQUE (user_id, whoop_id);

-- ── daily_stats: track WHOOP sleep provenance ─────────────────────────────────
ALTER TABLE public.daily_stats
  ADD COLUMN IF NOT EXISTS sleep_source TEXT,
  ADD COLUMN IF NOT EXISTS whoop_sleep_id BIGINT;
