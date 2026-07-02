-- Life Vault tables: media catalogue + world map persistence
-- Safe to re-run (IF NOT EXISTS / IF EXISTS guards everywhere)

-- =========================================================
-- Media log (books, films, shows, songs)
-- =========================================================
CREATE TABLE IF NOT EXISTS public.media_log (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category   text        NOT NULL CHECK (category IN ('book', 'film', 'show', 'song')),
  title      text        NOT NULL,
  rating     numeric(3,1),
  note       text,
  added_date date        NOT NULL DEFAULT current_date,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.media_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own media" ON public.media_log
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =========================================================
-- user_preferences — ensure visited_countries column exists
-- (table itself was created in a prior migration)
-- =========================================================
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS visited_countries text[] DEFAULT '{}';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS world_clocks jsonb DEFAULT '[]';
