-- Migration 010: weather background setting
ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS weather_bg_enabled BOOLEAN NOT NULL DEFAULT false;
