-- WHOOP integration: OAuth connections and daily metrics storage

CREATE TABLE IF NOT EXISTS public.whoop_connections (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token     text        NOT NULL,
  refresh_token    text        NOT NULL,
  token_expires_at timestamptz NOT NULL,
  whoop_user_id    bigint,
  whoop_display_name text,
  connected_at     timestamptz NOT NULL DEFAULT now(),
  last_sync_at     timestamptz
);

ALTER TABLE public.whoop_connections ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own WHOOP connection" ON public.whoop_connections
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.whoop_metrics (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                 date        NOT NULL,
  cycle_id             bigint,
  recovery_score       numeric(5,1),
  hrv_rmssd_milli      numeric(8,2),
  resting_hr           integer,
  strain               numeric(5,2),
  sleep_performance_pct numeric(5,1),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, date),
  UNIQUE(user_id, cycle_id)
);

ALTER TABLE public.whoop_metrics ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Users manage own WHOOP metrics" ON public.whoop_metrics
    FOR ALL USING (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;
