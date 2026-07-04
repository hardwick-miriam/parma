-- Migration 014: workout routines

CREATE TABLE IF NOT EXISTS public.routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  sessions jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- RLS
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user owns routines" ON public.routines
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS routines_user_active
  ON public.routines (user_id, is_active);
