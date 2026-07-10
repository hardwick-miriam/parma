-- N2 (BUGS.md): "Background effects on mobile" was persisted only to
-- localStorage, never to user_preferences — it survives a same-browser
-- refresh but silently diverges from every other setting (all
-- server-persisted) and doesn't follow the user across devices/browsers.

ALTER TABLE public.user_preferences
  ADD COLUMN IF NOT EXISTS bg_effects_mobile boolean NOT NULL DEFAULT false;
