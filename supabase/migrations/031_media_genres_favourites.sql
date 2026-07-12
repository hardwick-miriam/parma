-- Migration 031: genre tags (powers the taste radar) and a favourites-shelf pin override
ALTER TABLE public.media_log
  ADD COLUMN IF NOT EXISTS genres text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.media_log
  ADD COLUMN IF NOT EXISTS pinned_slot smallint
  CHECK (pinned_slot IS NULL OR pinned_slot IN (1, 2, 3));

-- One pin per (user, category, slot) — hand-picking a new #1 favourite film
-- should replace the old #1, not create a second one.
CREATE UNIQUE INDEX IF NOT EXISTS media_log_pinned_slot_unique
  ON public.media_log (user_id, category, pinned_slot)
  WHERE pinned_slot IS NOT NULL;
