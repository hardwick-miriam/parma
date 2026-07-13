# Parma Bug Audit — 2026-07-13

File+line references accurate as of commit `b101dc8`. This overwrites the 2026-07-11 audit — that
one's 8 items were all fixed and verified live, see `PROGRESS.md` for that trail. Scope: a full
codebase sweep across 4 areas, run as 4 parallel background research agents. **Important: only 2 of
the 4 audits actually completed** — the other 2 were cut off mid-run when the session hit its usage
limit (resets 2:30am Europe/London). Their scope is listed below as genuinely unaudited, not clean.

---

## Completed audits — findings fixed

### 1. `food_cache` had no RLS at all
**Tables audited**: all 34 tables across `supabase/migrations/001`-`031`. **Result**: 33 of 34
correctly RLS'd with a real `auth.uid() = user_id` policy (or `= id` for `profiles`). One gap:
`food_cache` (the shared OpenFoodFacts product cache, no `user_id` column) had **zero** RLS —
`ALTER TABLE ... ENABLE ROW LEVEL SECURITY` was simply never run for it. Any client holding a
session (this table is read/written via the anon-scoped client in `app/api/food/route.ts`, never
service-role) could read, write, or delete arbitrary cache rows directly, bypassing the app's
controlled upsert — not a privacy leak (no user data in the table) but a real integrity/DoS gap:
someone could poison the shared macro cache served back to every user, or wipe it wholesale.
**FIXED** (migration `032_food_cache_rls.sql`, commit `b101dc8`): enabled RLS with SELECT/INSERT/
UPDATE policies scoped to `auth.role() = 'authenticated'` — matching the app's existing behaviour
exactly (still no service-role requirement, so the cache-populate path keeps working) — and
deliberately no DELETE policy, since nothing in the app deletes from this table. Verified live via
`pg_class.relrowsecurity` and `pg_policies` after applying.

Also noted, not fixed (out of scope — Storage bucket policies, not a `public.*` table): the RLS
audit surfaced that `023_progress_photos_storage_rls.sql`'s own comment records the
`progress-photos` Storage bucket briefly had RLS enabled with zero policies before that migration
added owner-scoped ones — already fixed in that migration, just flagging it was found along the way.

### 2. Three silent-failure bugs in server-side Supabase calls
**Files audited**: all 16 `lib/db/*.ts` files and all 63 `app/api/**/route.ts` files, read in full.
- **`app/api/insights/route.ts`**: the cache-refresh delete+insert (clearing old insights, writing
  the freshly computed batch) checked neither call's error. If the delete failed but the insert
  succeeded, the table would hold both stale old rows and fresh new ones, and the next cache read
  would serve that duplicated mixed set as `cached: true` current data. **FIXED** (commit `b101dc8`):
  both errors now logged; if the delete fails, the insert is skipped entirely (rather than risking
  old+new coexisting) and the freshly-computed insights are still returned to the user this request,
  just not cached.
- **`app/api/review/route.ts`**: a `daily_stats` query's error was discarded; a genuine DB failure
  fell through as `rows = []` and returned "Not enough data for this period" — indistinguishable
  from a real new/quiet account. **FIXED** (commit `b101dc8`): error now checked, returns a real 500
  with a distinct message instead of masquerading as "not enough data."
- **`lib/db/whoop.ts`**'s `updateLastSync`: discarded its update error entirely. Currently dead code
  (zero callers — the real sync path uses a different, separately-implemented update in
  `lib/whoop/sync.ts`), so no live user impact today, but flagged because it's exactly the
  anti-pattern the standing no-silent-failure rule forbids and would silently reintroduce the
  "sync never advances, no error surfaced" bug class if anyone wires it back in. **FIXED**
  (commit `b101dc8`): now throws on error, matching every other function in the file.

---

## NOT completed — genuinely unaudited, flagged for a follow-up pass

### 3. UTC date bugs bypassing `getLocalDate()` — audit did not run
The background agent for this was terminated mid-run by the session usage limit before producing
any findings. **This area has not been checked in this pass at all** — do not read "nothing found"
here as "confirmed clean." One instance I noticed myself in passing while fixing #2 (not from a
completed audit, so not verified beyond a first read): `app/api/review/route.ts` lines ~17-20
compute month/year boundary dates via `new Date(year, month-1, 1).toISOString().split('T')[0]` —
constructs a date at server-local midnight then converts to UTC. On Vercel (server TZ is UTC) this
happens to produce the correct date with no drift, so it's low-confidence/likely benign in this
specific deployment, but it's inconsistent with the `getLocalDate()`/`date-fns-tz` convention used
everywhere else and worth a real look in a follow-up pass, not fixed here.

**Recommended next step**: re-run this specific audit (repo-wide grep for `toISOString().slice/split`
and local UTC-getter patterns building calendar-date strings) once budget allows.

### 4. Parser/schema-vs-table-column mismatches and dead-end UI — audit did not run
Also terminated by the session limit before producing any findings. **Not checked at all** in this
pass — this includes the main NLP parse pipeline's schema-vs-DB-column consistency
(`lib/schemas.ts` vs `supabase/migrations/*` vs `lib/logApply.ts`/`lib/db/*.ts`), a few other
insert-accepting routes (wardrobe/finances/media) for the same class of mismatch, and a repo-wide
scan for `<Link>`/`router.push()` targets that 404 or buttons with no-op/empty `onClick` handlers.

**Recommended next step**: re-run this audit fresh in a follow-up session.

---

## Suggested fix order for the next session
1. Re-run the UTC-date-bug audit (#3) and the parser/dead-end-UI audit (#4) — both were fully
   unstarted, not "clean," so this is the highest-value next step, not a nice-to-have.
2. If #3 turns anything real up in `app/api/review/route.ts`'s month-boundary computation, fix it
   using the same `subtractDay`/`daysAgo` helper pattern already established in `lib/date.ts`.
3. Everything in this document's "Completed audits" section is done and verified — no action needed
   there.
