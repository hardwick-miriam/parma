-- C1 (BUGS.md): enable RLS + owner policies on the 8 tables that were created
-- directly in Supabase and never got a migration file, so their RLS state was
-- unverifiable from the repo. All 8 use `user_id` as the ownership column,
-- matching every other table in this schema.
--
-- Safe to re-run: ENABLE ROW LEVEL SECURITY is idempotent, and each policy is
-- guarded so re-running this file doesn't error if the policy already exists.
--
-- NOT in scope here: full CREATE TABLE definitions for these 8 tables (a
-- separate, larger gap noted in CLAUDE.md — "Known sharp edges"). Writing
-- those from scratch without seeing the live column set risks getting types/
-- defaults wrong, which is worse than leaving the gap open. This migration
-- only touches RLS on tables that are confirmed to already exist in prod.

DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'user_preferences',
    'health_status',
    'injuries',
    'injury_checkins',
    'journal_notes',
    'progress_photos',
    'mounjaro_doses',
    'mounjaro_effects'
  ]
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
  END LOOP;
END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own preferences" ON public.user_preferences
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own health status" ON public.health_status
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own injuries" ON public.injuries
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own injury checkins" ON public.injury_checkins
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own journal notes" ON public.journal_notes
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own progress photos" ON public.progress_photos
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own mounjaro doses" ON public.mounjaro_doses
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users manage own mounjaro effects" ON public.mounjaro_effects
    FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- Verification query (run manually after applying, or via the service role
-- client): every one of these 8 tables should show rowsecurity = true and at
-- least one row in pg_policies.
--
--   select relname, relrowsecurity
--   from pg_class
--   where relname in (
--     'user_preferences','health_status','injuries','injury_checkins',
--     'journal_notes','progress_photos','mounjaro_doses','mounjaro_effects'
--   );
--
--   select tablename, policyname, cmd
--   from pg_policies
--   where tablename in (
--     'user_preferences','health_status','injuries','injury_checkins',
--     'journal_notes','progress_photos','mounjaro_doses','mounjaro_effects'
--   );
