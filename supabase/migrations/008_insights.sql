-- Migration 008: computed insights cache
CREATE TABLE IF NOT EXISTS public.insights (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,   -- 'correlation' | 'trend' | 'consistency' | 'week_comparison'
  metric_a     TEXT,
  metric_b     TEXT,
  title        TEXT NOT NULL,
  body         TEXT NOT NULL,
  strength     NUMERIC,         -- Pearson r for correlations, slope for trends
  computed_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT insights_unique UNIQUE (user_id, type, metric_a, metric_b)
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY insights_owner ON public.insights
  FOR ALL USING (user_id = auth.uid());
