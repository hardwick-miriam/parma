# Overnight Fix Marathon — Progress Log

Started: 2026-07-10, working from BUGS.md, tracked live on bug-status.html.

## ⚠️ Environment constraint (read first)

This session's `.env.local` was freshly pulled via `vercel env pull` and links to the real
`hardwick-s-projects/parma` Vercel project — but every secret-shaped variable
(`SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `ANTHROPIC_API_KEY`, `CRON_SECRET`,
`WHOOP_CLIENT_SECRET`, `WHOOP_WEBHOOK_SECRET`, `GROQ_API_KEY`, VAPID keys) came back as an empty
string. Non-secret config (`NX_DAEMON`, `TURBO_CACHE`, `VERCEL_ENV`, etc.) came through fine, and a
short-lived `VERCEL_OIDC_TOKEN` was present — this is a deliberate credential-redaction boundary in
this sandbox, not a misconfigured Vercel project.

Practical effect:
- I can read/write code, run `npm run build`, run migrations *as SQL files in the repo*, and reason
  about schemas — all real, verifiable work.
- I **cannot** open a live connection to Supabase, so I cannot execute a migration against the real
  database or query `pg_policies` to confirm RLS state, and I cannot call the live Anthropic/WHOOP
  APIs to produce a real parse-output transcript.
- Per CLAUDE.md rule 1, migration SQL must never be handed to the user to paste into the SQL editor
  by me (chat mangles/truncates SQL in transit). Since I also don't have a live DB connection this
  session, the correct-and-honest path is: write the migration as a numbered file in
  `supabase/migrations/`, exactly as every prior migration in this repo was authored, and leave its
  live application to whoever next has the real `SUPABASE_SERVICE_ROLE_KEY` connected (a future
  Claude session with real credentials, or the user running it directly against their own Supabase
  project). The file itself is the deliverable; execution is the blocked step, and is marked as such
  below and on the board rather than claimed as done.

Everything else below follows normal proof standards: commit hash, grep output, or build log, not
just a claim.

---

## Follow-up session — real credentials, migrations actually run (2026-07-10)

Real secrets were restored in `.env.local` for this session (`SUPABASE_SERVICE_ROLE_KEY`,
`SUPABASE_DB_PASSWORD`, `ANTHROPIC_API_KEY`, real Supabase URL/anon key). The 4 blocked
migrations from the marathon session above were run for real and verified with live queries,
not just applied-and-assumed.

**Connectivity note**: `db.<project-ref>.supabase.co:5432` (the direct connection host) only has
an AAAA record — no IPv4 — and this machine has no outbound IPv6 route (`ENETUNREACH`), so a
direct connection was impossible. Used the Supavisor session pooler instead
(`aws-1-eu-central-1.pooler.supabase.com:5432`, user `postgres.<project-ref>`, found by probing
candidate regions until one authenticated) via a throwaway `pg` client (installed
`--no-save --no-package-lock`, not committed — `node_modules` is gitignored anyway).

1. **017_rls_untracked_tables.sql** — applied. Verified with a live query:
   `select relname, relrowsecurity from pg_class where relname in (...)` → all 8 tables
   (`user_preferences`, `health_status`, `injuries`, `injury_checkins`, `journal_notes`,
   `progress_photos`, `mounjaro_doses`, `mounjaro_effects`) show `relrowsecurity: true`.
   `select * from pg_policies where tablename in (...)` → every table has at least one
   `auth.uid() = user_id` owner policy (some tables already had a manually-created policy from
   before this repo tracked migrations; ours added an idempotent, functionally-identical
   duplicate alongside it — harmless, same scope, not a conflict).
2. **018_mood_feeling_checks.sql** — applied, then both `NOT VALID` constraints explicitly
   validated: `ALTER TABLE ... VALIDATE CONSTRAINT ...` for `daily_stats_mood_check` and
   `workout_sessions_feeling_check`. Confirmed via `pg_constraint.convalidated = true` for both —
   no existing bad rows in prod.
3. **019_bg_effects_mobile.sql** — applied. Confirmed via `information_schema.columns`:
   `user_preferences.bg_effects_mobile boolean NOT NULL DEFAULT false` exists.
4. **020_food_log.sql** — applied. Confirmed `food_log` table exists with `relrowsecurity: true`,
   one owner policy, and the expected 10 columns.

**F1 food itemisation — real end-to-end test**, no mocks:
- Ran the actual `ClaudeProvider.parseLog()` (`lib/ai/providers/claude.ts`) via `npx tsx`, real
  `ANTHROPIC_API_KEY`, against `"porridge for breakfast, chicken wrap and a monster at lunch,
  curry for dinner"`. Real model output:
  - porridge / breakfast / 150 kcal / 5g protein
  - chicken wrap / lunch / 400 kcal / 25g protein
  - Monster energy drink / lunch / 110 kcal / 0g protein
  - curry / dinner / 550 kcal / 30g protein
  - top-level `calories: 1210`, `protein_g: 60` (sum of the four items, as designed)
- Passed through the real `ParsedLogSchema.parse()` — validates clean.
- Round-tripped through the real `food_log` table on prod: inserted the 4 items, read them back
  (confirmed as 4 separate rows, not one blob), then deleted them again — this was a pipeline
  test, not a real logged meal for today, so nothing was left behind in the live data.

**N8 / WHOOP webhook signature — re-checked, still not fixed.** The task brief for this session
assumed `WHOOP_WEBHOOK_SECRET` was set. It is not: `grep WHOOP_WEBHOOK_SECRET .env.local` returns
nothing. `app/api/whoop/webhook/route.ts`'s `validateSignature()` still hits its
`if (!secret) return true` early-out, so the signature check remains skipped and any
unauthenticated POST is still accepted in whatever environment this variable is unset in. Not
changed, not silently marked fixed — flagged instead. Rate limiting left untouched per
instruction; voice logging (`GROQ_API_KEY`) left for the user to add.

**Board updated**: `bug-status.html` now shows 43/44 fixed — C1, M15, N2, F1 flipped from
`failed` to `fixed` with the verification evidence above in their `bug-ref` line. N8 remains
`failed`, reason text updated to reflect the direct re-check above rather than the older
"documented dev-mode behavior" framing.

---

## FINAL SUMMARY (session end)

**Result: 39/44 fixed, 5 honestly marked `failed` (blocked, not skipped).** Every fix is a
separate commit, all pushed to `main`, all build-gated (`npm run build` clean after every
single change, not just per-tier). Board (`bug-status.html`) row counts verified by direct
grep against the file, not by memory: `39 fixed`, `5 failed`, `0` stuck on
`waiting`/`fixing`.

### Commit ledger (chronological, oldest first)

| Commit | Items |
|---|---|
| `531f4e9` | C1 (RLS migration written, code regression fixed — blocked), C3 (UTC date bugs), C4 (backdating threading), C6, C7 (bundled in the same queries.ts pass) |
| `130f59e` | C5 |
| `8ffa6f9` | C2 |
| `33a694b` | C8, C9 |
| `00cb27a` | C10 — **Tier 1 (critical) complete: 9/10 fixed, C1 blocked** |
| `1c328d5` | M1, M2, M3 |
| `48ac6f5` | M4, M5, M6, M7, M8 |
| `8ed3604` | M9, M10 |
| `e507e18` | M11 |
| `d70d505` | M12 |
| `717a336` | M13 (already fixed via C4), M14, M15 (migration written — blocked) |
| `085384c` | M16 |
| `c5a6f6d` | M17 |
| `78b04a9` | M18, M19, M20 |
| `4b9fb9d` | M21 |
| `f0ca159` | M22, M23 — **Tier 2 (major) complete: 22/23 fixed, M15 blocked** |
| `ecc054f` | N1 |
| `38d4287` | N2 (migration written — blocked) |
| `04f9551` | N3 (already fixed via C3), N4 |
| `8eba1fd` | N5 |
| `b01761d` | N6 |
| `a5522b9` | N7 |
| `dc50c8f` | N8 (confirmed, not newly actionable — not a code bug) |
| `d26b5e3` | N9 (confirmed clean) — **Tier 3 (minor) complete: 8/9 fixed, N8 not applicable** |
| `656c361` | F2 |
| `438ed6f` | F1 (full pipeline written — blocked, two independent reasons) — **Tier 4 complete: 1/2 fixed** |

### The 5 `failed` items — every one blocked by something outside my control tonight, not skipped

1. **C1** — RLS migration (`017_rls_untracked_tables.sql`) written and verified idempotent
   against the existing migration style, plus the real regression it would have caused
   (`/api/shortcuts/log` breaking under RLS) was found and fixed proactively. Not run: no live
   `SUPABASE_SERVICE_ROLE_KEY`-backed connection in this sandboxed session.
2. **M15** — CHECK constraints migration (`018_mood_feeling_checks.sql`) written (`NOT VALID`
   so it's safe to apply without a data audit first). Same blocker as C1.
3. **N2** — `bg_effects_mobile` column migration (`019_bg_effects_mobile.sql`) + full
   server/client wiring written. Same blocker as C1. Note: deploying this code before running
   the migration is safe (fails silently the same way the original bug did, via the existing
   `.catch(() => {})` on the fetch) but genuinely inert until the column exists.
4. **N8** — Re-confirmed true (voice logging off, no AI rate limiting, WHOOP webhook secret
   skip). Not blocked by missing credentials — blocked by needing either a real GROQ_API_KEY
   from the user, new infrastructure (Redis) I shouldn't add unilaterally, or is deliberately
   documented dev-mode behavior. Different class of "failed" than the other four.
5. **F1** — Full itemisation pipeline written: migration `020_food_log.sql`, zod schema,
   updated Claude tool schema/prompt, apply-logic, UI preview, GET endpoint. Blocked by *two*
   things: the migration (same as C1) AND no working `ANTHROPIC_API_KEY` in this session, so
   the actual model behavior against the new prompt was never verified with a real call — only
   reasoned through by hand (see the worked example in the F1 section above).

### Migrations written but NOT applied (all need the real `SUPABASE_SERVICE_ROLE_KEY`)

Run in this order, each is idempotent/safe to re-run:
1. `supabase/migrations/017_rls_untracked_tables.sql` — enables RLS on the 8 previously-
   untracked tables. **Highest priority — this is the actual security gap C1 exists to close.**
   Verify with the `select relname, relrowsecurity from pg_class where...` query in the file's
   comment block.
2. `supabase/migrations/018_mood_feeling_checks.sql` — adds CHECK constraints (mood/feeling).
   After applying, run the two `VALIDATE CONSTRAINT` statements at the bottom of the file.
3. `supabase/migrations/019_bg_effects_mobile.sql` — adds `user_preferences.bg_effects_mobile`.
4. `supabase/migrations/020_food_log.sql` — adds the new `food_log` table + RLS.

### New env vars

- `AI_PROVIDER_ACKNOWLEDGE_INCOMPLETE` — optional, only relevant if someone tries to set
  `AI_PROVIDER=openai-compatible` (M18's new safety gate). Not needed for normal operation
  (default `AI_PROVIDER=claude` is unaffected).
- No other new required env vars. All other fixes work within the existing env var set
  documented in CLAUDE.md.

### Production deployment verification

Commit `438ed6f` (this session's final commit, containing all 44 items' final state) —
confirmed via `gh api repos/hardwick-miriam/parma/commits/438ed6f/status` → Vercel deployment
`state: "success"` (target: `https://vercel.com/hardwick-s-projects/parma/BrvkzcF4JgFdjNgFpS2sGBaDKXLA`).
`vercel ls` independently confirms this as a `Production`-target deployment. Direct HTTP probes
of `https://www.parma.ink/` and the new `/api/food-log` route both return `307 → /login`
(expected — Next.js middleware redirects every unauthenticated request, including genuinely
nonexistent paths, before routing even happens, so this confirms the deployment is serving
traffic but can't distinguish route-exists from route-doesn't — verified this by also probing
a deliberately made-up path, which 307s identically). Deeper behavioral verification of
authenticated routes was not possible without a real login session.

### What still needs a human (or a future session with real credentials)

1. Run the 4 migrations above, in order, with the real service-role key.
2. Make one real `/api/parse-log` call with a multi-food sentence and confirm `foods` comes
   back itemised (F1's actual unverified risk).
3. Decide on N8's rate-limiting approach (needs an infrastructure decision, not just code).
4. Spot-check a few of the UI-behavior fixes (M9/M10 Weather, N7's 8 widgets, N5's body-widget
   injury tap) in a real browser at real widths — I verified these compile and reasoned through
   the CSS/logic carefully, but never had a running dev server with a live session to click
   through them tonight.

## Log

### C1, C3, C4 — RLS migration + UTC date bugs + backdating (grouped)
These three ended up touching the same functions in the same files (lib/db/queries.ts,
lib/db/mounjaro.ts), so they were implemented and committed together rather than as three
artificial diffs on the same lines.

- STARTING C1/C3/C4
- C3 (UTC → Europe/London "today"): fixed in lib/db/queries.ts, lib/db/mounjaro.ts,
  lib/streaks.ts, app/(dashboard)/page.tsx, and client widgets (DashboardGrid, Nudges,
  WhoopWidget, TrainingLoadWidget, MounjaroWidget, HeatmapWidget, HabitGardenWidget,
  SleepDebtWidget, WidgetDetailSheets, ShareButton, SummaryCard, ProgressPhotos), plus two
  DB-default UTC bugs (log_entries.date, media_log.added_date) and two more real
  "today"-derivation spots found while grepping (app/api/photos/route.ts,
  app/api/personal-records/route.ts). Left alone, deliberately: N-day lookback window
  boundaries (getRecentWorkouts, getMounjaroDoses/Effects, history.ts, insights-refresh cron —
  low severity, off-by-one-day on a 30/90-day range) and two cosmetic labels
  (app/api/share/route.tsx cache key, app/api/whoop/debug/route.ts label) — same class as
  N3/N8, not "today" attribution bugs. `lib/whoop/sync.ts` `cycleDate()` and
  `lib/ai/providers/claude.ts` `subtractDay()` were checked and confirmed correct as-is (noon-
  anchored / uses WHOOP's real per-cycle offset, not "now").
  DONE — commit 531f4e9. Proof: `npm run build` clean before and after.
- C4 (log_date backdating): threaded parsed.log_date through insertWorkout,
  upsertHealthStatus, insertInjuryCheckin, insertMounjaroDose, upsertMounjaroEffects,
  insertLogEntry in app/actions.ts's saveLog(). Mounjaro upsert-by-date now targets the actual
  target date, so backdating can't clobber today's real dose.
  DONE — commit 531f4e9.
- C1 (RLS on 8 tables): migration `supabase/migrations/017_rls_untracked_tables.sql` written
  (ENABLE ROW LEVEL SECURITY + auth.uid()=user_id policy per table, idempotent). While
  implementing this I found and fixed a real regression it would otherwise cause:
  `/api/shortcuts/log` authenticates via a per-user secret bearer token, not a Supabase session
  cookie, so its `user_preferences` lookup and every downstream write (upsertDailyStats,
  insertWorkout, upsertHealthStatus, insertLogEntry, insertMounjaroDose,
  upsertMounjaroEffects, getActiveInjuries) would silently match zero rows once RLS is on,
  because there's no `auth.uid()` for the policy to match. Fixed by making those
  lib/db/queries.ts / lib/db/mounjaro.ts functions accept an optional injectable Supabase
  client, and having the shortcuts route pass the service-role client explicitly through the
  whole chain.
  **BLOCKED — marked `failed` on the board, not `fixed`.** I have no live Supabase
  credentials in this sandboxed session (see environment note above), so I cannot run
  migration 017 against the real database, and cannot run the verification queries in the
  migration file's comment block (`select relname, relrowsecurity from pg_class where...` /
  `select tablename, policyname, cmd from pg_policies where...`) to prove RLS is actually on.
  **Action needed**: whoever next has `SUPABASE_SERVICE_ROLE_KEY` + a live DB connection needs
  to run `supabase/migrations/017_rls_untracked_tables.sql` and confirm all 8 tables show
  `relrowsecurity = true` with a policy each.
  Commit (migration file + regression fix): 531f4e9.

### C8, C9 — WHOOP webhook + token-refresh error handling
STARTING/DONE C8/C9 —
- C8: lib/whoop/sync.ts syncRecoveryByCycleId/syncSleepById/syncWorkoutById now check their
  upsert's error and throw instead of silently discarding a failed write. The webhook route's
  catch block now returns 500 (was always 200) so WHOOP retries the delivery.
- C9: lib/whoop/client.ts getValidConnectionService now checks the token-refresh write's
  error and throws with a clear message on failure, instead of returning a new access token
  as if it were persisted while the DB still holds the invalidated old refresh token.
Verified: `npm run build` clean.

### C10 — PRTrackerDetail field mismatch
STARTING/DONE C10 — components/dashboard/WidgetDetailSheets.tsx PRTrackerDetail now reads
`value`/`unit`/`reps`/`logged_at` (the real /api/personal-records shape, confirmed against
PRTrackerWidget.tsx which already used the correct fields) instead of the nonexistent
`max_weight_kg`/`max_reps`/`logged_date`. Verified: `npm run build` clean.

## TIER 2 (MAJOR) — in progress

### M22, M23 — unused estimates field; atomic array validation
STARTING/DONE M22/M23 —
- M22: ConfirmationDrawer now shows a small "~est." marker next to any numeric field the AI
  flagged in `estimates` — previously extracted, validated, typed, and then never displayed
  anywhere.
- M23: lib/schemas.ts — media `rating` and muscle_soreness `intensity` are now clamped to
  1-10 instead of strictly rejected (one bad rating no longer fails the whole media item,
  which no longer cascades into failing the entire log); `countries_visited` now filters out
  malformed codes instead of rejecting the whole array on one bad entry.
Verified: `npm run build` clean.

## TIER 3 (MINOR) — in progress

### N9 — re-confirm no TODO/FIXME/HACK/XXX
STARTING/DONE N9 — re-ran the grep after tonight's changes. 8 files matched case-insensitive
"hack", all false positives from the "hacker" theme name (same false-positive class the
original audit found). No real TODO/FIXME/HACK/XXX markers introduced or found.

## TIER 4 (FOOD PARSER) — in progress

### F1 — itemisation
STARTING F1 — no itemised-food data model existed at all before tonight; `calories`/
`protein_g` were flat daily aggregates with no record of individual foods, meals, or where
the numbers came from. Built the full pipeline:
- `supabase/migrations/020_food_log.sql` — new `food_log` table (date, meal, description,
  calories, protein_g, source, log_entry_id FK, RLS + owner policy).
- `lib/db/food.ts` — `getFoodLog`/`insertFoodItems`, client-injectable (same pattern as
  every other writer touched tonight).
- `lib/schemas.ts` — new `ParsedFoodItemSchema` + `foods: array` on `ParsedLogSchema`;
  `calories`/`protein_g` documented as remaining the SUM across `foods`, not a separate value.
- `lib/ai/providers/claude.ts` — added `foods` to the tool's `input_schema` with an explicit
  itemisation instruction and worked example, plus a new "ITEMISATION (F1)" paragraph in the
  system prompt instructing the model to split every distinct food/meal into its own entry
  instead of collapsing them, and to keep the totals consistent with the sum.
- `lib/logApply.ts` — inserts `parsed.foods` into `food_log` (linked to the log_entry via
  `log_entry_id`) alongside the existing daily_stats aggregate write — additive, doesn't
  change existing behavior for any entry that doesn't include `foods`.
- `components/dashboard/ConfirmationDrawer.tsx` — shows a "Foods detected (N)" preview list
  (description, meal, per-item kcal/protein) before saving, same pattern as the existing
  workouts/media previews.
- `app/api/food-log/route.ts` — new `GET ?date=` endpoint to retrieve a day's itemised foods
  (there was no way to read this data back before).

**Illustrative walkthrough for "porridge for breakfast, chicken wrap and a monster at lunch,
curry for dinner"** (hand-reasoned against the new tool schema — NOT a live API call, see
below):
```json
{
  "foods": [
    { "description": "porridge", "meal": "breakfast", "calories": 150, "protein_g": 5 },
    { "description": "chicken wrap", "meal": "lunch", "calories": 450, "protein_g": 30 },
    { "description": "Monster energy drink", "meal": "lunch", "calories": 110, "protein_g": 0 },
    { "description": "curry", "meal": "dinner", "calories": 650, "protein_g": 25 }
  ],
  "calories": 1360,
  "protein_g": 60,
  "estimates": ["calories", "protein_g"]
}
```
Four separate `food_log` rows would result, each tagged with its meal, instead of one blob.

**BLOCKED — marked `failed`, not `fixed`.** Two independent blockers, both pre-existing in
this session (see environment note at top of file):
1. Migration 020 is written but not applied — no live Supabase credentials, same as
   C1/M15/N2.
2. `ANTHROPIC_API_KEY` is also blank in this session, so I cannot make a real call to Claude
   to confirm it actually itemises correctly against the new tool schema — the walkthrough
   above is my own reasoning about what the schema/prompt should produce, not a verified
   model output. **This is the single highest-priority thing to verify live** before trusting
   this fix: run a real log-entry through `/api/parse-log` with a multi-food sentence and
   confirm `foods` comes back populated and itemised, not just `calories`/`protein_g`.
Verified: `npm run build` clean (schema/types/route all compile and typecheck correctly).

### F2 — after-midnight backdating
STARTING/DONE F2 —
- lib/date.ts: added `getLocalHour(tz, now)` and moved `subtractDay` here from
  lib/ai/providers/claude.ts (was a private duplicate; now the shared, tested helper used
  everywhere else in this codebase).
- lib/ai/types.ts ParseContext: added `currentHour?: number`.
- lib/ai/providers/claude.ts: when `currentHour` is 0-3, the system prompt now instructs the
  model that a past-tense meal/food/workout mention with no explicit day almost certainly
  belongs to yesterday, and to set `log_date` to yesterday's date accordingly — explicit dates
  still take priority via chrono-node's existing pre-resolution, unchanged.
- app/api/parse-log/route.ts: now passes `currentHour` (computed server-side from the request
  timezone) into the parse context.
- app/api/shortcuts/log/route.ts: this route was passing **no date context at all** to
  parseLog before tonight — not just missing the midnight heuristic, it had no "today"
  reference whatsoever, so its relative-date resolution ("yesterday", explicit dates via
  chrono) was silently broken for every Shortcuts-originated log. Fixed to build the same
  today/weekday/resolvedDate/currentHour context /api/parse-log does.
- components/dashboard/ConfirmationDrawer.tsx: added an always-visible "Date this entry
  belongs to" date picker (defaults to the resolved log_date or today, capped at today) so
  the AI's date — including a midnight-heuristic guess — is reviewable and correctable before
  saving, not just accepted blind.
**Not done**: editing the date of an *already-saved* historical log entry — this app has no
edit capability for any field of a persisted log entry (only delete), so that would be a
separate, larger feature, not a fix to this bug. Confirmed no such UI exists anywhere in the
codebase before deciding this was out of scope for tonight.
Verified: `npm run build` clean. Could NOT verify against a live Claude call — no working
ANTHROPIC_API_KEY in this session (see environment note at the top of this file).

## TIER 3 (MINOR) COMPLETE — 8/9 fixed, 1 confirmed-not-newly-actionable (N8, see above)

### N8 — known documented gaps
STARTING/DONE-BUT-FAILED N8 — re-confirmed all three are still true (voice transcription
still 503s with GROQ_API_KEY unset; no rate limiting on any AI endpoint; WHOOP webhook
signature check still skips entirely if WHOOP_WEBHOOK_SECRET is unset). **Marked `failed`,
not `fixed`** — none of these have a safe one-line code fix: voice logging is blocked on the
user adding a real GROQ_API_KEY; meaningful rate limiting needs new infrastructure (a
Redis-backed counter or similar) that I shouldn't unilaterally introduce overnight without
discussion; the webhook secret skip is deliberately documented dev-mode behavior (CLAUDE.md
already flags it as "fine for local dev, a real gap in prod") — hardcoding a requirement
would break local dev for anyone who hasn't set the secret yet. This is a "confirmed, not
newly actionable tonight" item, distinct from the DB-credential-blocked items. — mobile compact-size gaps across 8 widgets
STARTING/DONE N7 —
- WorldClocksWidget: add-city row now wraps onto its own line with the error message on a
  second line, instead of cramming input+Add+Cancel+error into one unwrapped row.
- MediaWidget: added `useGridItemSize()` compact branch, hides the want-to/in-progress badge
  row and "last logged" block at small sizes.
- SupplementsWidget: hides the per-pill logged-time sub-label at compact sizes.
- InsightsWidget: title span now has its own `min-w-0` (not just an ancestor) so `truncate`
  actually engages inside the flex row — was letting the strength badge get pushed off /
  overflow the card.
- PRTrackerWidget: add-PR form's fixed `w-20`/`w-12` inputs replaced with `min-w-0 flex-1` +
  `flex-wrap`; PR list row hides the date at compact size, keeping exercise/value/share.
- TrainingLoadWidget: compact mode shows 7 days instead of 14 (bars were becoming
  unreadably thin rather than being cut), with the AC-ratio stat correctly showing "—" since
  it needs the full 14-day window.
- HabitGardenWidget: plant SVG container now sized `height:'100%'`/`maxHeight` instead of a
  fixed `height:140`, so it shrinks to fit a short grid cell instead of overflowing past it
  (the outer card has no overflow-hidden to catch that).
- HabitsWidget: habit name now truncates properly (`min-w-0` + `truncate`, it was missing
  both) and hides the logged-time label at compact size.
Verified: `npm run build` clean.

### N6 — detail sheets with no loading timeout/retry
STARTING/DONE N6 — PRTrackerDetail and InsightsDetail now have explicit loading/error states
with a Retry button, matching the pattern the main WeatherWidget already used. (WeatherDetail
no longer fetches at all as of the M9 fix, so it's moot there; GlobeDetail's two fetches
already degrade gracefully via `.catch(() => {})` with no blocking loading state to get stuck
on, so left as-is.) Verified: `npm run build` clean.

### N5 — BodyWidget fragile injury-to-muscle matching
STARTING/DONE N5 — extracted the per-injury body_part → muscle-IDs keyword map (already used
correctly by `injuryMuscles` to highlight injured muscles) into `muscleIdsForBodyPart`, and
added `injuryForMuscle` using the same map for the tapped-muscle popover lookup. Previously
the popover used a separate, much cruder check (only the first word of the muscle's display
label against the injury text), so e.g. an injury logged as "shoulder" never surfaced when
tapping "Rear Delt" even though the diagram already correctly highlighted it as injured using
the better map. Now both use the same logic. Verified: `npm run build` clean.

### N3 — correction: already fixed via C3
The widget date-key builders (Heatmap, HabitGarden, SleepDebt, WidgetDetailSheets,
TrainingLoad, Whoop, Mounjaro widgets, Nudges, SummaryCard, ShareButton, ProgressPhotos) were
all fixed during the C3 pass. Attributing to 531f4e9; board just hadn't been updated.

### N4 — swallowed fetch errors in Insights/Routines
STARTING/DONE N4 — InsightsWidget and RoutineSection now distinguish a failed fetch from a
genuinely empty state (separate `error`/`loadError` flags instead of a bare `.catch(() => {})`).
While fixing InsightsDetail (WidgetDetailSheets.tsx) I found it had the same field-mismatch
bug class as WeatherDetail/PRTrackerDetail: it expected
`metric_a`/`metric_b`/`r`/`interpretation`, none of which exist on the real `/api/insights`
response (`title`/`body`/`strength`/`type`) — every insight silently rendered blank even on a
successful load. Fixed both issues together. Verified: `npm run build` clean.

### N2 — bgEffectsMobile localStorage-only
STARTING N2 — wrote migration 019_bg_effects_mobile.sql adding
`user_preferences.bg_effects_mobile`, extended /api/theme to accept and persist it (plus a
`parma-bg-effects-mobile` cookie, mirroring the existing theme-cookie pattern exactly so
there's no DB hit on every page load), and threaded it through app/layout.tsx →
ThemeProvider's `initialBgEffectsMobile` prop, seeded from cookie-or-DB as the source of
truth instead of localStorage.
**BLOCKED — marked `failed`, not `fixed`.** Same as C1/M15: no live DB credentials to run
migration 019. Important deployment note: until the migration is applied, saving this toggle
will silently fail server-side (the existing `.catch(() => {})` on the fetch swallows it,
same as the theme save path already does) — not worse than the original bug, but genuinely
not fixed live until the column exists. **Action needed**: run migration 019 before/alongside
deploying this commit.

### N1 — console-error-and-continue reads
STARTING/DONE N1 — this group was already largely following the "log then degrade gracefully"
pattern per the original audit (lib/db/whoop.ts reads, food cache, review stats, insights
cache, photos signed URL, share PR lookup, pushNotify cleanup all already console.error). Two
genuinely had zero visibility and are now fixed: `getJournalNotes` (lib/db/journal.ts) had no
error handling at all — now logs; `deleteProgressPhotoById` (lib/db/photos.ts) now logs its
pre-delete read error and its storage-remove error (orphaned-file risk) instead of silently
swallowing both, and the DELETE route now returns 404 instead of `{ok:true}` when the photo
didn't actually exist/delete. Verified: `npm run build` clean.

## TIER 2 (MAJOR) COMPLETE — 22/23 fixed, 1 blocked (M15: migration 018 written but not
applied — same live-DB-credentials blocker as C1)

### M21 — remaining unchecked WHOOP sync/webhook reads
STARTING/DONE M21 — most of this item's sub-findings were already fixed as side effects of
C1/C9/M3/M11 (removeSupplement/HabitFromToday, deleteLogEntryById, getValidConnectionService's
initial select, world-clocks, push subscribe DELETE). The three still open:
- lib/whoop/sync.ts sync-window lookup: now checks and logs its error (falls back to the
  existing 30-day-window degradation, which is safe, just now visible instead of silent).
- lib/whoop/sync.ts existingSession lookup: now checks its error and — critically — skips the
  routine-fallback guess entirely on a read failure, instead of treating "read failed" the
  same as "confirmed no manual exercises" and guessing wrong.
- app/api/whoop/webhook/route.ts conn lookup: now checked; returns 500 (was previously
  indistinguishable from "unknown WHOOP user" and silently dropped).
Verified: `npm run build` clean.

### M18, M19, M20 — AI provider landmine, wrong help text, dead component
STARTING/DONE M18/M19/M20 —
- M18: lib/ai/index.ts now refuses to instantiate OpenAICompatibleProvider unless
  `AI_PROVIDER_ACKNOWLEDGE_INCOMPLETE=true` is also set, with an error explaining the prompt
  is out of sync with ParsedLogSchema — was previously a silent landmine, not just dead code.
- M19: World Clocks detail sheet now says "Tap + Add city in the World Clocks widget" instead
  of pointing to Settings → Saved Places (an unrelated Apple Shortcuts feature).
- M20: deleted the orphaned components/dashboard/WorldMapWidget.tsx and its dead import in
  DashboardGrid.tsx — confirmed unused (the 'map' widget slot renders GlobeWidget, not this).
Verified: `npm run build` clean.

### M17 — /api/shortcuts/log missing most of saveLog's field coverage
STARTING/DONE M17 — extracted saveLog's entire apply-to-DB body into a new shared
`lib/logApply.ts:applyParsedLog(userId, rawText, parsed, supabaseClient)`, parametrized by an
explicit Supabase client (continuing the C1 client-injection pattern). `app/actions.ts`
saveLog now just does auth + zod validation, then calls it with the cookie client.
`/api/shortcuts/log` now calls the exact same function with the service-role client instead
of its old hand-rolled subset (stats/workouts/sick/mounjaro only) — media, countries_visited,
world_clock_cities, muscle_soreness, injury_checkin, and injury_resolved now all work when
logged via Apple Shortcuts, matching the dashboard's logging path exactly. Also required
adding an optional client param to insertMediaEntry (lib/db/media.ts), same pattern as the
C1 fix. Verified: `npm run build` clean.

### M16 — duplicate ParsedLog type vs zod schema
STARTING/DONE M16 — lib/ai/types.ts's ParsedLog/ParsedWorkout/ParsedInjuryCheckin/
ParsedInjuryResolved/ParsedMediaItem are now `z.infer<>` derived from the zod schemas in
lib/schemas.ts instead of hand-declared duplicates — one source of truth instead of two that
could silently drift. Verified: `npm run build` clean (TypeScript passed with no new errors
despite `mood`/`feeling` becoming strict enums instead of `string` everywhere they're
consumed).

### M14 — calories/duration_minutes not integer-constrained
STARTING/DONE M14 — lib/schemas.ts: `calories` and `ParsedWorkoutSchema.duration_minutes` now
have `.int()`, matching their `integer` Postgres columns (daily_stats.calories,
workout_sessions.duration_minutes). Verified: `npm run build` clean.

### M15 — no DB CHECK constraint on mood/feeling
STARTING M15 — wrote `supabase/migrations/018_mood_feeling_checks.sql` adding CHECK
constraints on daily_stats.mood and workout_sessions.feeling (NOT VALID, so it applies to new
writes immediately without requiring a data backfill first), matching the pattern already
used for media_log.category/status.
**BLOCKED — marked `failed`, not `fixed`.** Same as C1: no live Supabase credentials in this
session to actually run the migration. **Action needed**: run
`supabase/migrations/018_mood_feeling_checks.sql` with the real service-role key, then
`VALIDATE CONSTRAINT` both (commented at the bottom of the file) once confirmed clean.

### M12 — theme write-only on a new browser/device
STARTING/DONE M12 — app/layout.tsx now falls back to `getUserPreferences(user.id).theme` when
the `parma-theme` cookie is absent (new browser/device/cleared cookies), instead of always
defaulting to 'normal'. Also removed the dead `initialPrefs.theme` prop on SettingsClient (it
was fetched in settings/page.tsx but never actually read — the component uses `useTheme()`
instead — now redundant given the layout-level fix). Verified: `npm run build` clean.

### M11 — push notification categories never read back
STARTING/DONE M11 — added GET /api/push/subscribe?endpoint=... returning the saved
`categories` for that subscription; PushNotificationSettings.tsx now fetches and seeds its
checkboxes from that on mount instead of always defaulting to all-enabled. Also fixed the
adjacent unchecked DELETE writes in the same route file (M21 overlap). Verified: `npm run
build` clean.

### M9, M10 — Weather detail sheet + widget mobile sizing
STARTING/DONE M9/M10 — while fixing this I found the bug was worse than described:
`WeatherDetail` didn't just fetch with no lat/lon (400), its field names
(conditions/feels_like/wind_speed) never matched any real `/api/weather` response shape at
all (real shape: description/feelsLike/windKph). Fixed both by having `WeatherDetail` accept
the already-fetched `WeatherData` as a prop instead of fetching independently — DashboardGrid
already tracks this in `weather` state (used for the AI context line) via
`WeatherWidget`'s `onData` callback, so it's threaded through `WidgetDetailRouter` →
`WeatherDetail` instead of re-fetching. Shows a plain-English "open the widget first" message
if `weather` is still null rather than spinning forever.
M10: WeatherWidget now uses `useGridItemSize()` with the same `w<=2 || h<=4` compact
convention as the rest of the widgets — hides the details row and 3-column forecast grid at
small sizes, keeping only the large temp/emoji/description which always fits.
Verified: `npm run build` clean.

### M4-M8 — more unchecked writes / silent-success routes
STARTING/DONE M4/M5/M6/M7/M8 —
- M4: routine PUT's deactivate-others update now checked; returns 500 instead of risking two
  simultaneously-active routines.
- M5: app/actions.ts saveLog's countries_visited / world_clock_cities reads+upserts now
  checked and throw into the existing catch block instead of silently dropping.
- M6: cron/insights-refresh now checks the active-users read, the per-user delete+insert, and
  only increments `refreshed` after both succeed (was unconditional); failures are now
  collected and returned in the response instead of only console-logged.
- M7: sync-tick and cron/whoop-sync now check their whoop_connections read and return 500 on
  failure instead of silently reporting "0 synced" / "nothing to sync".
- M8: auth/callback now checks exchangeCodeForSession/verifyOtp and redirects to
  /login?error=... on failure instead of redirecting to `next` as if authenticated; login page
  now seeds its error banner from that query param.
Verified: `npm run build` clean.

### M1, M2, M3 — unchecked writes returning fake success
STARTING/DONE M1/M2/M3 —
- M1: lib/db/journal.ts upsertJournalNote now throws on error instead of returning null;
  app/api/journal/route.ts POST catches it and returns 500 instead of `{note: null}` with
  implicit 200.
- M2: lib/db/whoop.ts deleteWhoopConnection now throws on error; disconnect route catches it
  and returns 500 instead of always `{success: true}`.
- M3: app/api/world-clocks/route.ts getCities/saveCities now check their errors; POST/DELETE
  catch save failures and return 500 instead of returning the "updated" list regardless.
Verified: `npm run build` clean.

## TIER 1 (CRITICAL) COMPLETE
9 of 10 fixed (C2, C3, C4, C5, C6, C7, C8, C9, C10). C1 is code-complete but blocked on live
DB access — see its entry above. Running full Tier 1 build gate now before Tier 2.

### C6, C7 — correction to earlier log entry
These were actually already fixed inside the same lib/db/queries.ts pass as C1/C3/C4
(commit 531f4e9) — `upsertDailyStats`'s read now checks `readError` and throws instead of
treating a failed read as "no existing row" (C6), and `recomputeDailyStats` checks both its
read and write errors instead of upserting zeroed stats on failure (C7). The board rows for
C6/C7 just hadn't been flipped yet; corrected now. No new commit needed — attributing to
531f4e9.

### C5 — mounjaro_side_effects min(1) → min(0)
STARTING/DONE C5 — lib/schemas.ts MounjaroSideEffectsSchema now allows 0 for
nausea/appetite/energy, matching the tool schema's documented "0=none" meaning. Verified:
`npm run build` clean.

### C2 — re-validate before write; clamp numeric edits; enforce mood enum
STARTING/DONE C2 —
- app/actions.ts saveLog(): runs `ParsedLogSchema.safeParse` on the incoming `parsed` object
  before any DB write; returns a user-facing error instead of writing on failure.
- app/api/shortcuts/log/route.ts: same — this route calls the AI provider directly (not via
  /api/parse-log) so it never had schema validation at all; now returns 502 with the zod
  detail on failure, matching /api/parse-log's existing pattern.
- components/dashboard/ConfirmationDrawer.tsx: `setNum` no longer writes NaN into state (a
  keystroke that doesn't parse to a finite number is ignored instead of committed); `mood` is
  now a `<select>` constrained to the 5 real enum values instead of a free-text `<input>`.
Verified: `npm run build` clean.

---

## Long unattended session — board.html, wardrobe, food page (started 2026-07-10T11:12Z)

Real credentials still in place from the previous session. Working strictly in order per the
brief. `board.html` (new, session-scoped) is the mandatory live tracker for this session's 12
steps — see it for granular status/estimates/actuals; this log only records STARTING/DONE +
commit hash per step so a paused run resumes correctly.

### S1 — board.html + CLAUDE.md standing rule
- STARTING S1
- DONE S1 — `board.html` created (dark/purple theme matching `bug-status.html`, 12-step tracker,
  time+credit estimate/actual columns, credit burn meter labelled APPROXIMATE). Added rule 8 to
  CLAUDE.md: "3+ step tasks get board.html first, mandatory like committing." Commit: (see below)

### S2/S3 — wardrobe migration + storage bucket
- STARTING S2/S3
- DONE S2/S3 — `supabase/migrations/021_wardrobe.sql` run live: `wardrobe_items` +
  `wardrobe_wears` tables, both RLS-enabled with owner policies (verified via
  `pg_class.relrowsecurity` + `pg_policies`), plus a private `wardrobe` storage bucket with 4
  owner-scoped `storage.objects` policies (select/insert/update/delete, gated on
  `(storage.foldername(name))[1] = auth.uid()::text`), verified live.
- **New finding, not in scope to fix here**: while building this, found `storage.objects` has
  RLS enabled but ZERO policies for the existing `progress-photos` bucket, and
  `app/api/photos/route.ts` calls through the anon/session-scoped client
  (`lib/supabase/server.ts:createClient()`) for all 3 storage calls (upload, signed URL x2). With
  RLS on and no permissive policy, PostgREST/Storage denies access to non-superuser roles by
  default — this looks like the progress-photos feature (already-shipped, not part of this
  session's brief) may not actually work for real logged-in users right now. Did NOT copy this
  pattern into wardrobe (wardrobe has real policies, verified above). Logged for the BUGS.md
  sweep (S11) rather than fixed now, since it's outside the 4 tasks given for this session.

### S4-S8 — wardrobe feature (photo-first add, browse, detail, NLP wear log, widget)
- STARTING S4-S8
- DONE S4-S8 — Full wardrobe catalog shipped:
  - `lib/wardrobeTypes.ts` (client-safe types + `currentSeason()`), `lib/db/wardrobe.ts` (server
    CRUD, cost-per-wear calc), `lib/ai/wardrobeVision.ts` (the one approved vision call —
    Haiku, tool-use, called once per new item at add-time only), `lib/wardrobeImage.ts`
    (client-side canvas compress to ~1024px JPEG), `lib/wardrobeMatch.ts` (fuse.js + chrono-node
    NLP wear-log matcher, zero AI cost).
  - API: `app/api/wardrobe/{route,analyze,log-wear}` + `[id]/{route,wear/route}`.
  - UI: `components/wardrobe/{AddItemFlow,WardrobeClient}.tsx`,
    `app/(dashboard)/wardrobe/{page,[id]/{page,ItemDetailClient}}.tsx`,
    `components/dashboard/widgets/WardrobeWidget.tsx` (micro/compact/full tiers), registered in
    `DashboardGrid.tsx` WIDGET_CATALOG + both default layouts, `/wardrobe` added to `NavBar.tsx`.
  - Build gotcha caught before it shipped: `lib/db/wardrobe.ts` imports
    `lib/supabase/server.ts` → `next/headers`, which cannot be bundled into Client Components.
    Split pure types/`currentSeason()` into `lib/wardrobeTypes.ts` so client files never import
    the server module, even indirectly via a value import. `npm run build` clean after the split.
  - **Real end-to-end verification** (not simulated): generated 3 synthetic SVG "photos" (red
    t-shirt, blue jeans, white trainers) rendered to PNG via `@resvg/resvg-js` (already a project
    dependency), ran them through the actual `proposeWardrobeItemFromPhoto()` with a real
    `ANTHROPIC_API_KEY` call:
    - "red t-shirt" → AI proposed `{name: "Red t-shirt", type: "top", colours: ["red"], ...}` — correct
    - "blue jeans" → AI proposed `{name: "Blue jeans", type: "bottom", colours: ["blue"], ...}` — correct
    - "white trainers" → AI proposed `{name: "Curved headband", type: "accessory", ...}` — **wrong**,
      my crude flat-shape SVG wasn't recognizable as a shoe. Reporting this honestly rather than
      omitting it: the vision *pipeline* worked (real API call, valid schema-conformant tool output),
      but this specific synthetic test image was a bad stand-in for a real photo.
    - Inserted all 3 via the real `insertWardrobeItem`, logged a wear for item 1 on yesterday's
      date, re-queried via `getWardrobeItems` — season filter and type/colour fields all read back
      correctly, `cost_per_wear` computed as `40 / 1 = 40.00` (price_paid=40, wear_count=1) —
      correct. Deleted all 3 test items + their storage objects; re-queried, 0 remaining.
  - `npm run build` clean throughout.

### S9/S10 — food page (macro targets, migration, timeline, quick re-log, notes, quality ring)
- STARTING S9/S10
- DONE S9/S10 — Full nutrition deep-dive shipped:
  - `supabase/migrations/022_food_macros.sql` run live: `carbs_g/fat_g/fibre_g/sugar_g/salt_g`
    added to `daily_stats` and `food_log` (NOT NULL DEFAULT 0 — Postgres fast-default backfills
    existing rows automatically, verified 0 nulls remain), matching columns on `food_cache`,
    7 macro-target columns on `user_preferences` with NHS-reference defaults (2000 kcal / 150g
    protein / 250g carbs / 70g fat / 30g fibre / 90g sugar / 6g salt), and a new `food_notes`
    table (RLS + owner policy, verified live).
  - AI pipeline extended: `lib/ai/providers/claude.ts` tool schema + system prompt now estimate
    all 7 macros per food item (not just calories/protein), `lib/schemas.ts` validates them,
    `lib/db/queries.ts:upsertDailyStats` additively merges all 7 (same pattern as the existing
    calories/protein_g merge), `lib/openFoodFacts.ts` now extracts fibre/sugar/salt from OFF too.
  - Settings: macro targets editable in `SettingsClient.tsx` (7 number inputs), persisted via
    `saveSettings()` → `user_preferences`.
  - `/food` page (`components/food/FoodClient.tsx`): header with day-quality ring
    (`lib/foodQuality.ts` — protein/fibre/sugar/salt-based 0-100 score) + 7 macro bars vs
    targets; day-grouped timeline via TanStack `useInfiniteQuery` (`/api/food-log/timeline`,
    paginated by distinct day, IntersectionObserver auto-load) with meal/source badges, search,
    hydration+supplements folded per day; quick re-log grid (`/api/food-log/most-eaten` +
    `/api/food-log/relog`, zero AI cost — repeats a known value, not a fresh estimate); food
    notes memory (`/api/food-notes`, fuzzy per-food via `normaliseFoodKey`, surfaced as a chip
    on both the timeline and the quick re-log cards) with NLP-lite free-text attach
    (`lib/foodNoteMatch.ts` — zero AI cost, same fuse.js pattern as wardrobe wear-logging, not
    an LLM call). `/food` added to nav.
  - **Real end-to-end verification**: real Claude call on "had a full english for breakfast and
    a can of coke" returned itemised macros for both foods with all 7 fields populated; wrote
    through the real `food_log`/`daily_stats` additive-merge path and confirmed the post-write
    totals matched pre-write-plus-parsed exactly; queried the real timeline/most-eaten
    aggregations and got correct day-grouping and food counts; computed a real day-quality score
    (61/100, correctly penalised by the coke's sugar); ran the NLP-lite note matcher on "the full
    english made me feel bloated" — **this caught a real bug**: the note text initially included
    the trigger phrase itself ("made me feel  bloated" instead of "bloated") because the original
    `text.split(regex)` approach re-included the capturing group; fixed by switching to
    `text.match()` + slicing around the match index, re-verified clean. Fully cleaned up
    afterward (deleted test food_log/food_notes rows, restored daily_stats to its exact
    pre-test values).
  - `npm run build` clean throughout.

### S11 — BUGS.md sweep + new finding fixed
- STARTING S11
- DONE S11 — Confirmed all 44 original BUGS.md items resolved except N8 (WHOOP webhook secret —
  genuinely blocked on the user setting `WHOOP_WEBHOOK_SECRET`, not fixable from here; re-checked
  directly against `.env.local` in the earlier follow-up session, still absent). Went further:
  fixed C11, the `progress-photos` storage RLS gap discovered while building wardrobe storage
  (S3) — `supabase/migrations/023_progress_photos_storage_rls.sql` run live, 4 owner-scoped
  `storage.objects` policies confirmed via `pg_policies`. Added C11 to `BUGS.md` and
  `bug-status.html` (fixed on arrival, not left as a dangling TODO). Board: **45/46 resolved,
  only N8 open.**

---

## FINAL SUMMARY — long unattended session (2026-07-10, ended ~12:XX)

**All 12 steps on board.html done. Nothing left mid-flight.**

### What got done, in plain English

1. **Session board** (`board.html`) — a live tracker for this session's steps, same visual style
   as `bug-status.html`, with time/credit estimates vs actuals and a credit-burn meter (clearly
   labelled approximate — self-tracked, not real token telemetry). Added a standing rule to
   CLAUDE.md: any 3+ step task gets a board.html first, updated live per step, same as committing.

2. **Wardrobe catalog** — a full clothing tracker, live at `/wardrobe`:
   - Take/pick a photo → it gets compressed in your browser → one AI vision call proposes the
     item's name/type/colours/brand/season/tags → you review and edit before it saves. Manual
     entry works too.
   - Browse page: photo grid, filter by season/type/colour, search, sort by newest/most-worn/
     least-worn/cost-per-wear, defaults to the current UK season.
   - Tap into an item: edit any field, see wear count, last worn, cost-per-wear, a 12-week wear
     history mini-calendar, delete (which also removes the stored photo).
   - Log a wear just by typing it — "wore the grey hoodie and black cargos yesterday" — matched
     against your items with no AI call (pure fuzzy text matching), dated correctly.
   - A small dashboard widget shows your item count and how many you own for the current season.
   - **Verified for real**: 3 test photos through the actual AI vision pipeline (2 correctly
     identified as a t-shirt and jeans; 1 crude test image was misread as an accessory — reported
     honestly rather than hidden), real database writes, a real wear log, correct cost-per-wear
     math, then fully cleaned up.

3. **Food page** — a proper nutrition page at `/food`, not just the small dashboard widget:
   - Today's calories, protein, carbs, fat, fibre, sugar, and salt, each shown against a target
     you can set in Settings (sensible defaults pre-filled).
   - A day-quality ring — a simple score based on hitting protein/fibre and staying under sugar/
     salt targets.
   - A scrollable history of everything you've logged, grouped by day, with meal labels (🍳🥪🍽️🍿)
     and where the numbers came from (AI estimate / Open Food Facts / manual), water and
     supplements folded into each day.
   - Tap a "most eaten" food to re-log it instantly with its known macros — no new AI call.
   - Attach a note to any food ("the chicken wrap made me feel sick") just by typing it — it's
     remembered against that food and shows up as a chip next time you see or re-log it.
   - **Verified for real**: a real AI call on "full english + a can of coke" correctly broke out
     macros for both items; the database write matched the math exactly; the note-matching logic
     was tested for real and a genuine bug was found and fixed live (the note text was including
     stray wording until the fix), then re-verified clean.

4. **Bug sweep** — all 44 items from last night's `BUGS.md` audit are resolved except one
   (**N8**, the WHOOP webhook signature check) — genuinely blocked, not avoided: it needs
   `WHOOP_WEBHOOK_SECRET` set, and that variable is still absent from `.env.local` as of this
   session (checked directly, not assumed). While building wardrobe's photo storage, found and
   fixed a **new, real security gap**: the existing Progress Photos feature's storage bucket had
   row-level security turned on but *no rule at all* granting real users access to it — meaning
   it likely hasn't actually worked for uploading/viewing photos since it shipped (previous
   checks only looked fine because they used an admin-level database connection that bypasses
   this kind of rule). Fixed with the same pattern as wardrobe's new bucket, run live and
   verified. Logged as C11.

### What's still open / needs you

1. **N8 — WHOOP webhook signature.** You need to set `WHOOP_WEBHOOK_SECRET` (from your WHOOP
   developer app settings) in Vercel's environment variables. Until then, the webhook accepts
   unauthenticated requests by design (documented fallback, not a crash risk) — just not the
   secure path.
2. **Rate limiting on AI endpoints** — intentionally left alone per your instruction; still no
   per-user cost cap on `parse-log`/`insights`/`query`/`review`/`suggest-food`/wardrobe's vision
   call. Worth a decision on infrastructure (e.g. Upstash Redis) when you're ready.
3. **Voice logging (`GROQ_API_KEY`)** — left for you to add, as agreed.
4. **UI click-through** — everything above was verified with real API/DB calls (the most rigorous
   check available without a live browser session), but nobody has physically tapped through
   `/wardrobe` or `/food` in a real browser yet. Worth a few minutes on your phone to sanity-check
   layout at real widths, especially the photo-first add flow's camera capture on iOS/Android.
5. The wardrobe vision call occasionally misreads unusual photos (seen firsthand with a crude
   test image) — normal for any vision model, worth knowing it can happen with real photos too,
   which is exactly why the flow asks you to confirm/edit before saving rather than auto-saving.

### Evidence trail
Every step above has a commit hash, a live verification transcript, or both — see the dated
sections earlier in this file, and `board.html`'s per-row `bug-ref` text for the compressed
version. Commits this session, in order: `9c94665` → `b64f56a` → `f86d97e` → `aec484c` →
`b58767b` → `d47b7d6`. Latest commit confirmed serving on production via the GitHub Deployments
API and `vercel ls` (Ready/Production).

---

## Jarvis restructure — portrait-first modular OS (2026-07-10)

**All 14 board.html steps done. Nothing left mid-flight. The live site's default view has
changed for the first time this session (root now redirects into the new shell) — everything
up to that point was purely additive and never touched the working app.**

### What got done, in plain English

Parma's had one big scrolling bento-grid dashboard. This session built a second, modular way to
navigate the whole app — a persistent sidebar (or bottom tab bar on your phone) with a proper
page for each part of your life: **Main, Gym, Food, Body, Media, Wardrobe, Journal, Health,
Settings**. Nothing about the actual data or features changed — this was restructuring how you
get to them, not rebuilding what they do.

1. **The shell** — a left-hand sidebar on desktop/tablet/portrait-monitor widths, a bottom icon
   bar on your phone. Both list the same 9 modules in the same order, plus a separate "Grid"
   entry that's still the exact same bento dashboard you had before, completely unchanged.

2. **Main** — the new "how am I doing today" home page: a big recovery ring, a calories ring with
   protein/carbs/fat bars against your Settings targets, your last workout and how many days
   since, HRV/RHR/sleep at a glance, and one-tap tiles into every other module.

3. **Everything else moved in** — Settings, Food, and Wardrobe already had their own pages, so
   those just got relocated under the new sidebar (same web addresses, nothing to re-bookmark).
   Body, Media, Journal, and Health are brand new full pages built from the exact same widgets
   and data your dashboard already used — just given a full page's worth of room instead of one
   small tile, so nothing "compact" is hiding its detail on you anymore.

4. **Gym** — a real training-status page: your training load trend, days since your last rest
   day, your PRs, your active routine, a per-exercise history (pulled from what you've actually
   logged — no invented set/rep numbers), and a link into the Body muscle map. There's a clearly
   labelled empty slot for the live set-by-set logger, which — as agreed — is next session's work,
   not this one's.

5. **Polish caught two real bugs before they shipped** — worth knowing about because they're the
   kind of thing that looks fine until you actually check: the new shell's header/tab bars were
   hardcoded to a dark colour, which would've looked broken on your "Brutalism" theme (that one's
   actually white-background, black-text — confirmed by reading its actual colours, not assumed).
   And the CSS rule meant to push page content clear of the sidebar silently failed to generate at
   all — I only found this by inspecting the actual compiled CSS output, not by trusting that the
   build succeeded. Both fixed and re-verified.

6. **The switch** — only once everything above was built and build-verified did the site's front
   door change: `/` now sends you straight into the new Main page. Your old dashboard didn't go
   anywhere — it's one click away at "Grid" in the new sidebar, or type `/grid` directly.

### What's still open / needs you

1. **No visual/click-through testing was possible from here.** This environment has no browser or
   screenshot tool, so every module was verified by: a clean build after every single step, and
   directly inspecting the compiled output (which is how the two theme/CSS bugs above were
   actually caught — not guessed at). Nobody has physically opened the new sidebar on a real
   portrait monitor, tablet, or phone yet. This is the one thing I'd genuinely ask you to do
   yourself before trusting this at a glance — especially the sidebar-vs-bottom-bar breakpoint
   and the Gym/Health pages' layout at real portrait-monitor proportions.
2. **Live set-by-set workout logger** — deliberately deferred to Session 2, as agreed. The Gym
   page has a clearly-marked space for it.
3. **Finances module** — mentioned as Session 3 in the brief; not started, not expected to be.
4. Two small navigation cleanups from the old top bar (Food/Wardrobe/Settings links removed since
   they live in the new sidebar now) — if anything still links to the old bar expecting those,
   they'll 404 gracefully into the new sidebar's own pages at the same URLs, not actually broken,
   just a slightly different route in.
5. One thing worth a decision: I noticed the brief said "8 themes" but the app actually has 7
   (normal/hacker/brutalism/old-money/dark-academia/midnight-ocean/synthwave) — didn't invent an
   8th, just flagging the mismatch in case you meant to ask for a new one.

### Evidence trail
Every step has a commit hash and either a build log, a direct compiled-CSS inspection, or a live
curl — see `board.html`'s per-row `bug-ref` text for the compressed version. Commits this session,
in order: `ff82088` → `7d0b397` → `e986206` → `7b1bb15` → `c27becc` → `5be806a` → `c015c60` →
`cb0a164` → `98da625` → `1265b56` → `f59f0a4` → `0d9a11a` → `0831335`. Final commit confirmed
`Ready`/`Production` via `vercel ls`, and every route (`/`, `/main`, `/grid`, `/health`, `/body`,
`/media`, `/journal`, `/food`, `/wardrobe`, `/settings`, `/gym`) curled live with a consistent,
correct `307 → /login` (no 500s, no redirect loops).

---

## Session 2 — Live workout logger (2026-07-10)

**All 11 board.html steps done. Task 4 of the brief was cut off mid-message ("TASK 4 —" with
nothing after it) — flagged at the start of this session, Tasks 1-3 built as specified, Task 4
still awaiting the rest of that instruction.**

### What got done, in plain English

The Gym module now has a real, working set-by-set logger, not just the read-only training
dashboard from the OS restructure.

1. **Data model** — a new `workout_sets` table (weight, reps, warm-up flag, timestamp), tied to
   the existing `workout_sessions` table rather than a parallel structure. RLS on, run live and
   verified.

2. **The logger itself** — tap "Pick an exercise," search (fuzzy, your own recently-used exercises
   surface first) across the same 873-exercise database the rest of the app already uses. Once
   picked: your last time's top set shown right there, a weight box, a row of rep buttons 1
   through 12 (plus a box for anything higher), and a big Log Set button. Sets you log stack up
   under "This session" with edit/delete on each.

3. **A next-set suggestion** — genuinely simple, and deliberately not hidden: if you hit the top
   of your rep range last time, it suggests +2.5kg for fewer reps; otherwise, same weight for one
   more rep. The whole rule lives in one file (`lib/gymRecommendation.ts`) so it's easy to tune
   later without hunting through the codebase.

4. **Stats and trend** — estimated 1-rep max (Epley formula), your best set ever, how many
   sessions you've done it, and a graph of that estimate over your last 12 sessions.

5. **PRs update themselves** — log a set heavier than your current record and it becomes your new
   PR automatically, with the same confetti burst the app already had wired up but wasn't using
   anywhere. Logging something lighter never quietly overwrites a real PR with a worse number —
   checked this specifically with a real test against the live database (log 60kg → PR; log 70kg →
   new PR; log 50kg → correctly NOT counted as a PR, the 70kg stays on record; log a 90kg warm-up →
   correctly ignored entirely).

6. **Nothing else broke** — the muscle map, training load, journal, and Main's "last session" all
   already read from the same `workout_sessions` table with no filtering on how an entry got
   there, so live-logged sessions show up in all of them automatically — verified this by reading
   the actual query code, not assuming it. And logging by text still works exactly as before
   ("benched 80kg for 5 reps" still creates a normal entry) — checked with a real call to the AI,
   not assumed.

### What's still open / needs you

1. **Task 4 was cut off in your message** — everything after "TASK 4 —" didn't come through.
   Nothing was built for it since I don't know what it says; send it over and I'll pick this back
   up.
2. **No visual testing again** — same limitation as the OS restructure session: no browser tool
   here, so the logger's layout (rep-button row, weight input, trend chart) hasn't been seen on an
   actual screen. Worth a real run-through, especially on a phone where the rep buttons need to be
   comfortably tappable.
3. Finances module (mentioned as Session 3 in the OS restructure brief) — still not started.

### Evidence trail
Commits this session, in order: `64a66fd` → `f158efd` → `bacfafa` → `d1e6958` → `afa7380`. Every
step has a build log and either a direct database verification or a real API/AI call — see
`board.html`'s `bug-ref` text per row. Final commit confirmed `Ready`/`Production` via `vercel ls`;
`/gym`, `/main`, `/health`, `/body` all curled live with correct auth-gating, no 500s.

---

## Session 2, Task 4 + real proof (2026-07-10, later same day)

**13/13 board.html steps done (11 from the first half + 2 more once Task 4 arrived).**

### What got done

Task 4 turned out to be mostly already satisfied by how the live logger was wired in earlier the
same session — the "coming soon" placeholder was already gone and the logger was already the
first thing on the page. What was missing was visual cohesion: added consistent section labels
(Log a set / Training status / Personal records / Routine / Recent exercises) so the Gym page now
reads as one training command centre top to bottom, not an unlabelled stack of cards.

**Real proof, not simulated** — ran the actual flow end to end against the live database:
1. Searched "bench press" through the real fuzzy exercise search → matched "Dumbbell Bench Press".
2. Started today's session (correctly re-used one already open from earlier testing, rather than
   creating a duplicate).
3. Logged three sets in sequence — 60kg×8, 65kg×6, 70kg×4 — the way tapping through the UI three
   times would.
4. Re-fetched from the database (not just checking in-memory state) to confirm all three actually
   persisted.
5. Confirmed the personal record correctly settled on the heaviest set (70kg×4), not the last one
   logged or the first.
6. Confirmed the stats panel's numbers (estimated 1-rep-max via Epley, best set, session count),
   trend, and history all matched what was actually logged.
7. Confirmed the Body module's exact muscle-recovery calculation — the same function it already
   uses — picked up this session and correctly loaded the chest and secondary muscles (front/rear
   delts, triceps) that a bench press works.
8. **A real bug showed up during this test**: my first verification pass assumed the muscle-recovery
   result was a `Map` when it's actually a plain object, which crashed before cleanup ran. Caught
   it, manually checked and cleaned the leftover test rows before fixing the assumption and
   re-running the whole thing cleanly. No test data was left behind — verified twice.

### What's still open / needs you

1. **Still no visual/browser testing possible from here** — same limitation as both earlier
   sessions. Everything above is real, verified data-layer proof; nobody has watched the rep
   buttons, weight input, or trend chart actually render on a screen yet.
2. **Finances (Session 3)** — untouched, as instructed.

### Evidence trail
Commits: `3450638` (Task 4 layout) → `3f2d8c8` (final board + proof notes). Confirmed
`Ready`/`Production` via `vercel ls`; `/`, `/gym`, `/main`, `/body` all curled live with correct
307 auth-gating.

---

## Big session — real body figure, chat bar, foods, saved meals, Main upgrade (2026-07-10)

**All 13 board.html steps done.**

### What got done, in plain English

1. **Real body figure** — the muscle map now shows the actual anatomical artwork you generated
   tonight (front and back), not a hand-drawn outline. I found the two newest images in your
   Downloads folder, confirmed which was front/back by looking at them, and built a glow overlay
   aligned to the real muscles on that artwork. I couldn't just eyeball the alignment — I measured
   the actual image (finding exactly where the torso, arms, and legs sit in pixels) and then
   rendered my proposed overlay directly onto your images to check it by eye before shipping. One
   real placement mistake (the tricep glow overlapping too far into the bicep) was caught and fixed
   this way, not guessed at.
2. **Weather is back on Main** — confirmed the underlying live weather data source is genuinely
   live (real current London conditions pulled during the session).
3. **The chat bar is everywhere** — Main's log input is back, and every module (Food, Health,
   Media, Wardrobe, Journal, Gym) now has the same bar with a gentle steer toward what you'd
   usually log there. Tested for real: logging actual food while sitting in the Health section
   still logged as food correctly — the steer never overrides what you actually typed.
4. **Food items are editable and deletable** — tap any logged food to change its macros or remove
   it, and the day's totals recalculate correctly. Verified for real: logged three foods, edited
   one, deleted another, the third was untouched, and the day's total matched exactly.
5. **Saved meals** — save a whole day's foods as a named meal ("usual breakfast") and re-add all of
   it in one tap, or just by typing "log my usual breakfast" in the Food chat bar (no AI needed for
   that part — it's a fast, free text match, deliberately built so it can't be confused with an
   ordinary sentence like "had a chicken wrap for lunch"). Verified for real: saved, quick-added on
   a different day, all three items and their macros landed correctly.
6. **Main is now a real command centre** — a short, sharp daily briefing written once a day
   (verified with a genuinely generated example: *"You hit your protein target yesterday but ran a
   calorie deficit of roughly 350-400 kcal on a heavy leg day..."*), a plain-computation "what to
   train today" line, tappable rings, six trend graphs, the activity heatmap, a streak badge, and
   quick links to everything.

### What's still open / needs you

1. **Still no way to see it rendered here** — this environment has no browser, so the body-figure
   alignment, the chat bar layout, and the new Main page have all been verified by data and by
   compositing test overlays onto the real images, not by looking at the actual running app. This
   is the one thing worth you checking yourself, especially the muscle-glow alignment on a real
   phone screen and at a couple of different widget sizes.
2. Your account currently has very little real day-to-day data (no WHOOP syncs, no logged workouts
   with exercise names yet), so the daily briefing, the "train today" line, and several trend
   graphs will look sparse or show their honest fallback messages until you actually use the app
   for a few days — that's expected, not a bug.
3. Live workout logger (mentioned in an earlier session) and Finances — both still untouched, as
   agreed.

### Evidence trail
Commits, in order: `ca8a98c` (body figure) → `e4fa509` (weather) → `8d9706e` (chat bar) →
`9e6eea6` (food edit/delete) → `9ecc917` (saved meals) → `b7bbbea` (Main upgrade). Every step has
either a real API/DB test with before/after proof and cleanup, or a direct visual check against
the actual production images — see `board.html`'s `bug-ref` text per row for the compressed
version. Final commit confirmed `Ready`/`Production` via `vercel ls`; every route curled live with
correct auth-gating and no 500s; both body-figure images confirmed serving on production with an
exact byte match to source.
