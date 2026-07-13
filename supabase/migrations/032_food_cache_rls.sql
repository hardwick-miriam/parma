-- Migration 032: food_cache had no RLS at all (a shared OFF product cache, no
-- user_id column) — any client holding a session could read/write/delete
-- arbitrary rows directly, bypassing the app's controlled upsert entirely.
-- app/api/food/route.ts reads (SELECT) and writes (UPSERT) this table via the
-- session-scoped anon client, never the service-role client, so the policies
-- below match that existing behaviour rather than locking writes to
-- service-role only (which would break the current cache-populate path).
-- No DELETE policy is added — nothing in the app deletes from this table, so
-- omitting it blocks wholesale deletion outright once RLS is enabled.
ALTER TABLE public.food_cache ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can read the food cache" ON public.food_cache
    FOR SELECT USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can populate the food cache" ON public.food_cache
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Authenticated users can refresh the food cache" ON public.food_cache
    FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN null; END $$;
