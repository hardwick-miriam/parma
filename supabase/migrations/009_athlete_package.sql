-- Migration 009: athlete package — personal records table
CREATE TABLE IF NOT EXISTS public.personal_records (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise    TEXT NOT NULL,
  value       NUMERIC NOT NULL,
  unit        TEXT NOT NULL DEFAULT 'kg',  -- 'kg','lbs','reps','seconds','km','m'
  reps        INTEGER,                     -- optional: for weight × reps PRs
  logged_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  notes       TEXT,
  CONSTRAINT pr_unique UNIQUE (user_id, exercise, unit)
);

ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY pr_owner ON public.personal_records
  FOR ALL USING (user_id = auth.uid());
