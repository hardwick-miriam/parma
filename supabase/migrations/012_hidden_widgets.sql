-- Migration 012: hidden widgets persistence
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS hidden_widgets TEXT[] NOT NULL DEFAULT '{}';
