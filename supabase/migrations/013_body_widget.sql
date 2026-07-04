-- Migration 013: muscle soreness logging + recovery multiplier persistence

CREATE TABLE IF NOT EXISTS public.muscle_soreness (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  muscle_id text NOT NULL,
  intensity integer NOT NULL DEFAULT 5 CHECK (intensity BETWEEN 1 AND 10),
  logged_at timestamptz DEFAULT now() NOT NULL,
  source text DEFAULT 'log'  -- 'log' | 'voice'
);

CREATE TABLE IF NOT EXISTS public.muscle_soreness_multipliers (
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  muscle_id text NOT NULL,
  multiplier numeric NOT NULL DEFAULT 1.0,
  reports integer NOT NULL DEFAULT 1,
  updated_at timestamptz DEFAULT now() NOT NULL,
  PRIMARY KEY (user_id, muscle_id)
);

-- RLS
ALTER TABLE public.muscle_soreness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.muscle_soreness_multipliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user owns soreness" ON public.muscle_soreness
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user owns multipliers" ON public.muscle_soreness_multipliers
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index for efficient per-user lookups
CREATE INDEX IF NOT EXISTS muscle_soreness_user_logged
  ON public.muscle_soreness (user_id, logged_at DESC);
