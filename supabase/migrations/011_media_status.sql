-- Migration 011: media status (want-to, in-progress, finished)
ALTER TABLE public.media_log
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'finished'
  CHECK (status IN ('want-to', 'in-progress', 'finished'));
