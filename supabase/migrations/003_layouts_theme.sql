-- Add drag-and-resize layout storage and theme preference
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS layouts jsonb DEFAULT '{}';

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS theme text DEFAULT 'normal';
