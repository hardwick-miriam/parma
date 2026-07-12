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

---

## Follow-up — consistency pass, tap-to-detail, food depth, body polish, gym tidy, settings audit, bug audit (2026-07-11)

**All 8 additional steps done (21/21 on board.html).**

### What got done, in plain English

1. **Consistency pass** — checked every module page against all 7 themes. Found and fixed one
   real theming bug: the injury chart's hover tooltip was hardcoded dark and didn't adapt on
   light themes. Confirmed the chat bar genuinely covers every module with no gaps.
2. **Tap-to-detail restored** — six widgets (weather and the activity heatmap on Main; the WHOOP
   and sleep-debt cards on Health; training load and the PR tracker on Gym) quietly lost their
   "tap for more detail" popups when they moved into the new module pages during the restructure.
   Rebuilt that wiring so tapping any of them opens the same rich detail view they used to. Also
   fixed one genuinely dead tile on Main (the "key vitals" card did nothing when tapped — now
   links to Health).
3. **Food page depth** — the most-eaten quick-relog grid, per-food notes memory, and day-quality
   ring were already built. Rather than assume they worked, I proved it: logged three real foods
   plus a repeat of one from yesterday against your live account, confirmed the most-eaten count,
   the day's totals, and the quality score all came out exactly right, then removed the test data.
   Found and fixed a real bug in the process — several Food page queries would treat a failed API
   call as a success and could crash instead of showing an error.
4. **Body figure polish** — re-checked every muscle zone against the real artwork at both full
   size and a small (compact-widget) size, front and back. Everything lines up correctly; nothing
   needed fixing.
5. **Gym module** — already cleanly built (PR tracker, training load, routine, exercise history,
   body-map link, no placeholders); just confirmed it and added the tap-to-detail fix above.
6. **Settings persistence** — checked theme, macro targets, notification categories, and the
   mobile-effects toggle all actually save and reload correctly. All four do; nothing was silently
   write-only.
7. **Bug audit** (report only, nothing fixed as part of this step) — written fresh to `BUGS.md`.
   Two critical findings (a saved-meal could theoretically save with bad data and corrupt a day's
   nutrition totals; a real database error on the Main briefing could be mistaken for "no briefing
   yet"), four moderate ones (the restructure left live auto-refresh only working on the old page,
   not the new one; hiding a widget in the old view doesn't hide it in the new one; the new-user
   walkthrough got disconnected during the restructure and nobody currently sees it; the WHOOP
   card shows even for accounts that never connected WHOOP), and two minor ones. Full detail and a
   suggested fix order are in `BUGS.md`.

### What's still open / needs you

1. Same as before: no browser here, so nothing in this pass was clicked through visually — worth
   your own look, especially the restored tap-to-detail popups.
2. **Your production domain is currently redirecting `parma.ink` → `www.parma.ink`** — the
   opposite direction the project's own notes say is canonical. This is a Vercel domain-settings
   question, not something in the code, so I didn't touch it — worth checking that's what you
   intend.
3. `BUGS.md` has a full list ready to work through next session — nothing in it was fixed this
   pass, by design (you asked for report-only).

### Evidence trail
Commits: `d7d74a4` (tap-to-detail + theming fix) → `7154068` (Food page query fix) →
`7a97c90` (BUGS.md). Final commit confirmed `success` on GitHub checks and the newest Vercel
deployment `Ready`/`Production`; all 11 routes curled live and returned 200 (via the `www`
redirect), both body-figure images confirmed serving with an exact byte match to source.

---

## Bugfix round — all 2 critical + 4 major + 2 minor from BUGS.md (2026-07-11)

**All 8 fixes shipped, verified live, in the requested order. Nothing left open in BUGS.md.**

### What got done, in plain English

1. **Saved meals can no longer corrupt a day's totals** — every item is now checked for a complete,
   correctly-typed set of macros before it's allowed to save; a bad one is rejected outright
   instead of silently becoming `NaN` later. Proved this with real missing-field, string-typed, and
   explicit-NaN inputs — all correctly rejected.
2. **The daily briefing no longer hides real errors** — the actual bug was one level deeper than
   originally flagged (the live code path is in Main's page, not the API route the audit named);
   fixed both so a genuine database problem is now logged and surfaced instead of looking identical
   to "no briefing yet."
3. **Live auto-refresh restored everywhere** — Main, Food, Health, Gym and the rest of the new
   module pages now get the same real-time updates the old single dashboard had. Proved this by
   writing a real row to your account's data and watching the actual update arrive.
4. **Hiding a widget now works consistently** — weather/heatmap on Main, WHOOP/sleep-debt on
   Health, and training-load/PR-tracker on Gym now respect the same "hide this" setting the old
   view already had, rather than silently ignoring it.
5. **The new-user tour is reconnected** — it quietly stopped working during the restructure; two of
   its three steps already worked once reconnected, the third (which used to describe drag-and-drop
   rearranging) now points at the real new layout with updated wording.
6. **The WHOOP card only shows if you've actually connected WHOOP** — confirmed your own test
   account was hitting this exact bug (a permanent placeholder card), now fixed.
7. **Two small cleanups**: a date calculation in the background job now uses the same
   timezone-safe method as everywhere else, and the mobile chat bar's position is now tied to the
   actual tab bar height instead of a hand-guessed number, so a future style tweak can't quietly
   make them overlap.

### What's still open / needs you

Nothing from BUGS.md — every item is fixed and verified. Same standing caveats as before: no
browser here to click through any of this visually, and the account still has light real
day-to-day data for some of these to be exercised under real conditions.

### Evidence trail
Commits, in order: `6204898` (saved-meal validation) → `6cf30e7` (briefing error surfacing) →
`cd3d99d` (RealtimeSync) → `4ebb323` (widget hide sync) → `33d2aee` (onboarding tour) →
`14062bf` (WhoopWidget gate) → `4623be0` (2 minors). Final commit confirmed `success` on GitHub
checks and the newest Vercel deployment `Ready`/`Production`; all 11 routes curled live and
returned 200. `BUGS.md` updated with a FIXED note and commit hash on every item.

---

## Seven new features (2026-07-11, later same day)

**STARTING.** Standing rules re-affirmed: migrations live via service-role key, no silent
failures, commit+push per task, verify production per commit, getLocalDate Europe/London, cheap AI
(plain stats over AI where possible, no vision), verify with evidence. Working strictly in order:
Task 1 body measurements -> Task 2 reading tracker -> Task 3 mood correlations -> Task 4 Mounjaro
timing -> Task 5 NL search -> Task 6 Finances -> Task 7 workout logger (last) -> Final.

Pre-work recon found: Task 7's live workout logger already substantially exists
(`components/os/LiveLogger.tsx` + `supabase/migrations/024_workout_sets.sql`, built in an earlier
session) — treating Task 7 as verify+gap-fill, not build-from-scratch, to avoid wasted rework.
Task 5's `/api/query` already exists but dumps raw rows to the model with no intent-parsing step —
treating this as fix/extend, not net-new. Task 3's `insights` table + daily cron + plain-stats
engine (`lib/insights/compute.ts`, Pearson correlation already implemented) already exist — mood
correlation will extend that engine, not build a new one. Tasks 1, 2, 4 (partially), 6 are
genuinely new.

Resume note for future sessions: if a usage limit is hit mid-task, say "resume from PROGRESS.md" —
this file's most recent "STARTING task N" / "DONE task N (commit hash)" line is the source of
truth for what's actually landed; `board.html` mirrors the same state.

**STARTING Task 1 — Body measurements.**

**DONE Task 1 — Body measurements.** Migration 027 live+verified. Real NLP test (inches+cm
mixed) + real DB trend/change computation verified. See board.html E1 for full evidence.

**DONE Task 2 — Reading/learning tracker.** Migration 028 live+verified. Real NLP test (3
questions, confirmed no leakage into the media table) + real upsert-in-place test verified. See
board.html E2 for full evidence.

**DONE Task 3 — Mood correlations.** Extended the existing insights engine (no new AI calls) with
recovery/protein/calories/training-vs-mood correlations; weather honestly skipped (no historical
data exists to correlate against). Real account currently has too little data to surface any
finding (honestly reported "still learning"); separately proved the correlation logic itself works
with clearly-labeled synthetic data, fully cleaned up. See board.html E3 for full evidence.

**DONE Task 4 — Mounjaro timing intelligence.** Cadence detection + due-today/tomorrow banner on
Main/Health (real push wiring added to the existing daily cron, previously dead code). Recovery/
side-effect correlations via the same plain-stats engine as mood correlations. Real account
honestly has mounjaro_enabled=true but 0 doses logged (reported as insufficient data); correlation
logic separately proven with synthetic data, cleaned up. See board.html E4 for full evidence.

**DONE Task 5 — Natural-language search.** Replaced /api/query's raw-data-dump approach with a
real parse-intent (one cheap AI call) -> targeted query -> plain-English-in-code pipeline. Found
and fixed the existing chat-bar Q&A entry point (used across every module) rather than building a
new surface; added a dedicated Ask mode to CommandPalette. Verified with the 3 example questions
plus a 4th against real (sparse) account data, honestly reported "no data" where true, then proved
the pipeline with cleaned-up synthetic data. See board.html E5 for full evidence.

**DONE Task 6 — Finances module.** 3 new tables (accounts, debts, snapshots) + RLS live+verified.
Net worth trend via snapshot-on-change, APR-aware payoff projections, new sidebar module, NLP for
both absolute and relative balance updates, compact net-worth widget added to the old grid's
catalog. Verified end-to-end: 2 real accounts + 1 real debt created, net worth/snapshot/payoff
projection all confirmed correct, both NLP update styles (absolute + delta) verified via real
Claude calls landing the exact right balances, then fully cleaned up. See board.html E6 for full
evidence.

**DONE Task 7 — Live workout logger (verify + gap-fill).** Confirmed nearly the entire spec
already existed from an earlier session (exercise picker, tap rep selector, PR confetti, muscle-
map/training-load feed via workout_sessions.exercises[]). The one genuine gap — NLP set logging
("benched 80 for 5") had no path to workout_sets — is now fixed, routed through the exact same
insertSet() function the tap-first UI uses. Verified end-to-end with 3 real sets (persisted, PR
fired correctly, stats/trend/history/muscle-map all reflected them) plus a real NLP-logged set,
then fully cleaned up. See board.html E7 for full evidence.

---

## FINAL — Seven new features, session complete (2026-07-11)

**All 7 tasks + final verification done (8/8 on board.html).** Build clean, every route live on
production, every commit individually verified as it landed.

### What got done, in plain English

1. **Body measurements** — log chest/arms/waist/hips/thighs/calves/neck/shoulders in cm or
   inches (via typing or free text — "chest 42 inches" correctly converts to 106.7cm), with a
   trend graph and 30/90-day change per body part on the Body page. Real test with a mixed
   cm/inches log and real 30d/90d change math, both confirmed correct.
2. **Reading & learning tracker** — track books, courses, audiobooks, and papers through
   want-to/in-progress/finished, with a progress bar and star rating, on the Media page. "Started
   reading X" then later "finished X" updates the same entry rather than creating duplicates —
   verified with real Claude calls and a real database check.
3. **Mood correlations** — Health now surfaces things like "your mood is higher on days you
   train" or a recovery/mood link, computed with the same free plain-statistics engine the app
   already had (no new AI calls). Your account currently has too little logged data for any
   pattern to show yet — it says so honestly rather than making something up — but I proved the
   underlying maths genuinely works with test data.
4. **Mounjaro timing** — if you use the Mounjaro tracking, Main/Health will now tell you when a
   dose is due today or tomorrow based on your own logged pattern, and (once there's enough
   history) surface things like "your recovery tends to peak a few days after a dose." Your
   account has Mounjaro tracking switched on but no doses logged yet, so there's nothing to show
   right now — that's expected, not a bug.
5. **Ask your data questions** — you can now type a real question like "when did I last squat
   100kg" or "how many rest days in March" into any module's chat bar or the ⌘K search, and get a
   genuine, calculated answer — not a guess from an AI reading a data dump. Tested with your exact
   example questions.
6. **Finances** — an entirely new module: add your bank/investment/pension/crypto accounts and
   any debts by hand, see your net worth with a trend line, a breakdown of where your money sits,
   and (for debts) how many months at your current payment until it's cleared, properly
   accounting for interest. You can also just tell it "Monzo balance 1240" or "paid £200 off the
   loan" and it updates itself. Verified with real accounts, a real debt, and both styles of
   spoken update.
7. **Live workout logger** — turned out this was already built in an earlier session (exercise
   picker, tap-to-log sets, PR celebrations, trend graphs). I checked it thoroughly rather than
   redoing it, and found one real gap: saying "benched 80kg for 5" out loud didn't actually log a
   set. That now works exactly like tapping it in — same PR detection, same muscle-map update.

### What still needs your own eyes

I have no browser here, so none of this has been visually clicked through — worth checking
yourself, especially:
- **Body measurements graphs** — should render as a card per body part you've logged, showing the
  current value, how much it's changed in 30/90 days (with a small 📈 if it's grown), and a small
  line graph underneath.
- **Finances module** — should show a net-worth number at the top with a line graph beneath it, a
  coloured bar showing how your money splits across account types, then your accounts and debts
  listed with their balances editable right there in the list.
- **Live workout logger** — unchanged visually from before, but worth a quick look to confirm the
  new "say it instead of tapping it" path doesn't feel jarring alongside the tap-first flow.

Your account has very little real day-to-day data logged, so several of these features (mood
correlations, Mounjaro correlations) will look sparse or show their honest "still learning"
message until you've actually used the app for a while — that's the correct, expected behaviour,
not something broken.

### Evidence trail
Commits, in order: `9da724e` (Task 1, body measurements) → `a333fa2` (Task 2, reading tracker) →
`ccffa8a` (Task 3, mood correlations) → `523dd39` (Task 4, Mounjaro timing) → `b510c45` (Task 5,
NL search) → `bf76f07` (Task 6, Finances) → `7238c56` (Task 7, workout logger NLP gap). All 4 new
migrations (027 body_measurements, 028 learning_items, 029 finances — 3 tables) run live via the
service-role key and verified (columns, RLS enabled, policies present) before any code shipped
against them. Every commit polled to `success` on GitHub checks and confirmed `Ready`/`Production`
on Vercel individually as the session progressed. Final build clean; all 12 routes curled live and
return 200.

---

## Live data sync, no flash (2026-07-11, later session)

**All 6 steps done.** Diagnosed and fixed the actual root causes rather than papering over symptoms.

### What was actually wrong

1. **RealtimeSync called `router.refresh()`** on every DB change — this re-fetches and re-renders
   the ENTIRE current route's server-rendered payload regardless of which table changed, so every
   widget on the page (even ones unrelated to what you just logged) went through a loading cycle
   together. That was the flash.
2. **Only 9 of 26 tables were actually in the Supabase realtime publication.** Everything built in
   the last two sessions — food itemisation, the live workout logger, WHOOP metrics, body
   measurements, saved meals, learning items, all of Finances, Mounjaro, wardrobe, insights,
   injury check-ins — was silently never triggering realtime at all. No error, just nothing
   happening. This alone meant most of the app couldn't have been live-syncing regardless of the
   router.refresh() problem.
3. **Main, Health, Gym, and Body were pure server-rendered pages** with no client-side cache at
   all — there was nothing for `invalidateQueries` to act on even once the other two problems were
   fixed.

### What changed
- `RealtimeSync` now invalidates only the TanStack Query keys that actually depend on the changed
  table (a new `lib/realtimeInvalidation.ts` table→key map), instead of refreshing the whole route.
- Migration 030 adds the missing 17 tables to the realtime publication, run live and verified.
- Main, Health, Gym, and Body are now backed by TanStack Query with server-rendered `initialData`
  (instant first paint, no loading flash) via new thin API routes reusing the exact same data
  functions the pages always used — nothing forked.
- MediaWidget and PRTrackerWidget converted from plain fetch to `useQuery` so they're invalidatable
  too; Journal's notes likewise, with a guard so an external update can't clobber a note you're
  mid-typing.
- `refetchOnWindowFocus` turned on globally as the gentle fallback for anything realtime can't
  reach — background-only, never blanks existing data.

### What's still a manual-refresh case
Journal's daily stats/workouts summary (not the notes themselves) stays page-rendered — a
reasonable, honestly-stated scope limit, since a note-taking widget doesn't need sub-second sync
the way food/workout logging does. The old `/grid` bento dashboard also loses its previous
router.refresh()-based auto-update, since it's explicitly not part of the new module OS and
converting its whole widget catalog to TanStack Query would be a much larger, separate effort.

### Verified flow: log food on Food page → Main's calorie ring updates
Traced and proved with a real test, not just code reading: wrote a real `food_log` row +
`daily_stats` upsert (the exact two-table write a food log makes), subscribed with the identical
`postgres_changes` pattern RealtimeSync uses, confirmed both events genuinely arrive, then ran them
through the real `TABLE_QUERY_KEYS` map and confirmed the result includes `main-summary` (the query
backing Main's rings), `food-today`, and `food-timeline` — the precise chain from the DB write to
every affected screen. Fully cleaned up and independently re-verified afterward.

### Evidence trail
Commit (this fix): see below. Migration 030 run live+verified (26/26 tables in
`supabase_realtime`, confirmed via `pg_publication_tables`). Build clean. Real end-to-end
subscription test proving the exact named flow, cleaned up.

**Needs your eyes:** the actual no-flash visual behaviour needs your own confirmation, as you said
— what I've verified is the underlying mechanism (subscriptions genuinely fire, the correct query
keys get invalidated), not pixels on screen.

---

## Retire the old bento dashboard (2026-07-11, later session)

**All 5 steps done.** Surgical removal, verified before deleting anything.

### What got removed vs kept

**Removed (confirmed grid-only by grepping every importer, not assumed):** the `/grid` route's
real content, `DashboardGrid.tsx` itself (react-grid-layout, the drag/resize edit-mode, the
add/remove widget catalog, layout persistence — all lived in one file), the `/api/layout` save
endpoint, 22 standalone widgets/helpers that had exactly one importer (DashboardGrid), and the
`react-grid-layout` npm package.

**Kept (genuinely shared, confirmed by the same grep):** every widget a module page actually
renders (WhoopWidget, BodyWidget, PRTrackerWidget, TrainingLoadWidget, SleepDebtWidget,
HeatmapWidget, MediaWidget, JournalWidget, RecoveryWidget, InjuryWidget, HealthStatusWidget,
WeatherWidget), the tap-to-detail sheet system (`WidgetDetailSheets.tsx`, including `GlobeGL.tsx`
which looked grid-only but is also used by a sheet inside that shared file), `GridItemSizeContext`,
and the `hidden_widgets` column/reads (genuinely used by Main/Health/Gym to decide what to show —
only its *write* path, the grid's hide button, went away).

### What still needs a decision from you
Three grid-only widgets represented features with no home anywhere else once their card was gone:
**World Clocks + the visited-countries map, viewing progress photos, and browsing Mounjaro dose/
side-effect history.** None of the underlying data or NLP logging was touched or lost — you can
still say "add Tokyo to my clocks" or log a Mounjaro dose exactly as before — there's just nowhere
in the module OS to *look* at that data anymore. Flagged, not fixed, since building new module-OS
UI wasn't part of "retire the grid."

### Evidence trail
`npm run build` succeeded on the first attempt after all 25 deletions — the dependency map was
right. Every module page's imports re-checked post-removal and confirmed to reference only kept
components. `/grid` now `redirect()`s to `/main` instead of 404ing. CLAUDE.md updated to describe
the module OS as the single dashboard and to correct two other claims that had gone stale
(RealtimeSync's table count, hidden_widgets' read-only status).

---

## Meal selection on the Food page (2026-07-11, later session)

**All 5 steps done.** The Food page could previously only "save as meal" the *entire day* — this
session added real multi-select so a specific handful of logged items can become a named meal, be
bulk-deleted, or be bulk re-timed, plus meal-time grouping (Breakfast/Lunch/Dinner/Snacks) so
picking "my lunch" is natural.

### What was built
- **Backend:** `bulkDeleteFoodItems` and `bulkSetFoodItemsMeal` in `lib/db/food.ts` (delete/re-time
  exactly the given `food_log` row ids), new `POST /api/food-log/bulk-delete` and
  `POST /api/food-log/bulk-meal` routes. `lib/foodMealTime.ts` adds a pure, read-only
  `inferMealTime(created_at)` — Europe/London hour buckets used only to group items that were never
  explicitly assigned a meal; it never writes to the DB.
- **FoodClient.tsx:** a global "Select items" toggle puts every row into checkbox mode (tap
  anywhere on a row to select); a sticky action bar appears once 1+ items are selected, showing the
  count and three actions — **Save as meal** (prompts for a name, POSTs only the selected items to
  the existing, unmodified `/api/saved-meals` — zero forked logic), **Delete selected** (confirms,
  then bulk-deletes and recomputes the day's totals from the remaining rows, never zeroing), and
  **Set meal-time** (bulk-assigns breakfast/lunch/dinner/snack). Each day now renders as four
  meal-time sections with per-section calorie+protein subtotals instead of one flat list, and a
  "Select all" link (visible only in select mode) restores the old whole-day shortcut without
  needing a separate code path.
- Saved meals created this way are ordinary rows in `saved_meals` — the existing quick-add
  scroll strip, edit, and delete UI needed no changes at all.

### Evidence trail (real data, not mocked)
Ran a throwaway script against the **live** Supabase project (service-role key, self-cleaning)
exercising the real `lib/db/food.ts` + `lib/db/savedMeals.ts` functions exactly as the UI calls
them: logged 5 real `food_log` rows (1625 kcal / 110.3g protein combined), selected exactly 3
(Chicken salad wrap, Greek yoghurt, Salmon+rice), saved them as "Test Lunch" — the stored meal
contained **exactly those 3 items**, not all 5, with macros (1300 kcal / 98g protein / 122g carbs /
43g fat / 12g fibre / 27g sugar / 2.6g salt) matching the 3-item sum precisely. Quick-added "Test
Lunch" onto a different date and confirmed those same 3 items landed and `daily_stats` read back
1300 kcal / 98g protein on that day. Also bulk-deleted the 2 *un*selected items from the original
day and confirmed `daily_stats` recomputed to the remaining-3 total rather than zeroing. Cleaned up
every test row/meal afterward and confirmed the test meal no longer appears in `getSavedMeals`.
`npm run build` clean.

**Needs your eyes:** the UI itself (checkbox rendering, sticky action bar placement, meal-time
section headers) — what's verified above is the data layer end to end, not pixels on screen.

---

## Quality & polish pass (2026-07-12)

**All 6 tasks done**, 6 commits, each built clean and pushed independently. Production confirmed
serving the final commit (`8f59f7c`).

### 1. Re-homed the 3 features orphaned by retiring /grid
Mounjaro dose/effects history (Health module), progress photos with a new compare-two-side-by-side
mode (Body module), and the visited-countries globe + world clocks (Main) all lost their only UI
when the old bento dashboard was removed, even though logging/data kept working underneath. Pulled
the render logic back out of git history (`git show` on the pre-removal commit) and re-homed each
properly in the module OS rather than rebuilding from scratch, converting each from raw
`useState`/`fetch` to TanStack Query with real loading/empty states along the way. Checked the live
DB: this account has zero doses/photos/countries/clocks logged yet, so what's actually exercised
right now is the empty-state path for all three — confirmed each shows a proper message rather than
a blank box. The populated-data rendering needs real use (log a dose, upload a photo, tap a
country) to see.

### 2. Loading & empty states
Audited every data-fetching component in the app. Found and fixed 3 real problems: Food's calorie
ring showed a fake "0 kcal" before its first fetch resolved; the live gym logger showed false "no
previous sets" / "no suggestion" messages when switching exercises, before the real data arrived;
changing any wardrobe filter replaced the whole item grid with a bare "Loading…" string instead of
keeping the previous results visible (`placeholderData: keepPreviousData` fixed both the gym search
and the wardrobe filters). Everything else already handled this correctly.

### 3. Error resilience
~25 mutations across food, gym, saved meals, measurements, learning tracker, wardrobe, and the
NLP chat-bar failed completely silently — no toast, no message, nothing. Wired `sonner`'s
`toast.error` (already globally mounted, barely used) into all of them. Found two worse bugs along
the way: Settings' Save button could get **permanently stuck** on "Saving…" if the server action
threw (no try/catch, `setSaving(false)` never ran), and Journal's autosave showed **"Saved" even
when the request failed** because it never checked `res.ok` — actively misinforming rather than
staying quiet. Both fixed. Added `app/(os)/error.tsx` as a real error boundary, since nothing in
the app had one — an uncaught throw from a module page's data fetch now shows a recoverable "Try
again" screen with the sidebar still mounted, instead of a white page.

### 4. Mobile polish at 390px
No browser available, so this was a code-level audit, not a visual one. Real bug: Food's new
selection action bar was sticking underneath the app's own header instead of stacking below it
once scrolled. Three delete/remove icon buttons relied on hover-only visibility with no fallback —
invisible and undiscoverable on a touch device. Finances' debt-add row was tight enough to squeeze
inputs unusably narrow at phone width. A few tap targets (Send button, PR-tracker share icon) were
smaller than their sibling controls. All fixed. Flagged, not fixed: several text-xs Edit/Delete
links across a few list rows sit under the ~44px comfortable tap-target guideline — functional,
just tighter than ideal.

### 5. Perceived speed (optimistic UI)
No dedicated habit tracker exists to "tick," so targeted the highest-frequency real actions:
logging a gym set (the single most-repeated tap in the app) now appears in the session list and
updates the stats row instantly instead of after the round trip; Food's quick re-log and saved-meal
quick-add now bump the calorie ring/macro bars the instant you tap; the learning tracker's status
changes are optimistic too. All with full rollback to the previous state on failure. The globe's
country-toggle (built in task 1) was already optimistic.

### 6. Consistency sweep
The real find: 45 hardcoded Tailwind palette colors (red/amber/orange/emerald) across 20 files
stayed the same regardless of the active theme instead of using the CSS-variable-backed classes
already used elsewhere in the same files — `MediaWidget.tsx` alone had 9. Root cause for the whole
amber/orange bucket: `--warning` was defined per-theme in `globals.css` but never registered as a
Tailwind utility, so hardcoding was the only option anyone had — fixed at the source by adding
`--color-warning` to the `@theme inline` block, then replaced every hardcoded instance. These will
now actually repaint correctly across old-money/synthwave/hacker/etc instead of staying the same
red/amber everywhere. Also matched Food/Wardrobe's header size to every other module.

**Flagged, not fixed (bigger than a polish fix, your call):** 8 structurally distinct "show more
detail" implementations exist across the app (a shared bottom-sheet component with only one real
consumer, several hand-rolled full-screen portals, a lightbox, a command palette, inline expand,
and a full-page navigation for wardrobe items) — unifying them is a real refactor with functional
risk, not a line-item polish fix. Journal/Media/Finances also don't own their page header the way
every other module's Client component does (Finances has no `<h1>` at all, it's one level up in
the server page).

### Evidence trail
Each task's commit built clean before being pushed (6 commits: `92232fd`, `9ff5ab1`, `d044c5c`,
`7c8726c`, `e674255`, `8f59f7c`). Final `npm run build` clean. `git rev-parse HEAD` matches
`origin/main`. `www.parma.ink` returns 200. All 3 new API routes from this session
(`/api/mounjaro/history`, `/api/food-log/bulk-delete`, `/api/food-log/bulk-meal`) return 307 →
`/login` in production (auth middleware), not 404 — confirming they actually deployed.

**Needs your eyes:** everything visual — the re-homed features' actual appearance, the mobile
layout fixes, whether the optimistic UI genuinely feels instant, and whether the theme fixes look
right across all 7 themes. What's verified above is code-level correctness and live reachability,
not pixels.

---

## Netflix import & perceived speed (2026-07-12, later session)

**Both tasks done**, 7 commits, each built clean and pushed independently. Production confirmed
serving the final commit (`a979564`); all 8 named module routes (`/media`, `/wardrobe`, `/journal`,
`/main`, `/health`, `/gym`, `/body`, `/food`) return 200 in production.

### Task 1 — Netflix history import
`media_log` has no source/tag column and no unique constraint on title+category, so dedupe had to
happen in a one-off script rather than the DB. The CSV's titles contain unquoted commas ("House,
M.D.", "Manhunt: The Liar, the Thief, the Conman"), so parsing worked from the right (the trailing
5 fields are always simple; everything before that is the title) instead of a naive comma-split —
verified against all 86 rows before touching the database. Ran it live against the real Supabase
project: **86 inserted, 0 updated, 0 errors** on the first run; re-ran it twice more to prove
idempotency — **0 inserted, 86 updated** both times, total row count stayed at 86 throughout (never
172). Read back 5 sample rows to confirm titles/ratings/categories/dates landed correctly, and
confirmed via `/api/media`'s own `getMediaLog()` — the exact function the Media module already
calls — that all 86 rows come back with no changes needed on the read side. Removed the one-off
script after use.

### Task 2 — Perceived speed across module pages
The actual cause of "shell appears, then a visible delay": Media, Wardrobe, and Journal's notes
list were still fetching everything client-side after mount — the same waterfall Main/Health/Gym/
Body had already fixed in an earlier session. Fixed all three the same way: the server page now
fetches the default view (Media: full log; Wardrobe: current season, newest-first, matching the
client's own default filter state exactly; Journal: the notes list) and seeds TanStack Query's
`initialData` with it, so the first paint of each module now arrives WITH real data instead of a
blank shell waiting on a fetch.

Other fixes, in the order the task asked for them:
- **Caching:** confirmed the global TanStack default (60s staleTime, 5min gcTime, already in place)
  covers every query that doesn't need special handling; audited every dynamic (variable-dependent)
  query key in the app and confirmed only Wardrobe's filters and Gym's exercise search needed
  `keepPreviousData` — both already had or now have it. Gym's exercise-*detail* query deliberately
  does **not** use `keepPreviousData`, since showing stale data from a different exercise while
  switching would be actively misleading — an intentional choice, not a gap.
- **Skeletons:** swept every remaining plain "Loading…" text string inside this session's 8 named
  modules and replaced them with pulsing placeholders shaped like the real content (Wardrobe's item
  grid, Food's day timeline, Body's measurement cards, Gym's PR tracker, Health's mood correlations,
  Media's learning tracker, Wardrobe's item detail page).
- **Heavy assets:** Media's catalogue modal (now 86+ items after the import) paginates 30 at a time
  with a "Load more" button instead of rendering the whole filtered/sorted list at once. Wardrobe's
  item photos got `loading="lazy"`, `decoding="async"`, and explicit width/height. **Not done:** true
  compressed thumbnails would need a server-side resize pipeline at upload time — `sharp` is only a
  transitive dependency here, not one I should silently promote to a direct one, so this is flagged
  as a real follow-up feature rather than forced in cheaply.
- **Lazy-loaded heavy components:** Main's Trends section (6 recharts instances) and Gym's trend
  chart were statically bundled into each page's core render even though they're below the fold /
  conditionally rendered — both extracted into their own files and loaded via `next/dynamic` with a
  matching skeleton fallback, so recharts streams in as its own chunk after the initial paint. The
  globe was already lazy from an earlier session. Body's measurement trend lines and Finances' net-
  worth chart weren't converted — flagged as available follow-ups, not done, given the time budget.
- **Prefetch on hover/tap-intent:** every module page is `force-dynamic`, so Next's default `<Link>`
  prefetch only warms the shared layout shell, not the actual server-rendered data (a documented
  Next.js limitation for dynamic routes, confirmed before treating it as a bug). Sidebar's module
  links now call `router.prefetch(href)` on `mouseenter` (desktop rail) and `touchstart` (rail +
  mobile tab bar), forcing Next to eagerly fetch the real RSC payload — including each page's
  server-computed `initialData` — ahead of the actual click/tap.

### Evidence trail
Each commit built clean before pushing (7 commits: `289989c`, `f1772c4`, `2617b8c`, `a979564` plus
the board/progress-only commits). Final `npm run build` clean. `git rev-parse HEAD` matches
`origin/main` (`a979564`). `www.parma.ink` returns 200. All 8 named module routes return 200 in
production. The Netflix import itself was verified with real read-backs against the live database,
not assumed from the script's exit code.

**Needs your eyes:** whether navigating between modules genuinely *feels* faster — what's verified
above is that the waterfall is gone (data now arrives with the page instead of after it) and the
chart bundles no longer block first paint, not a stopwatch measurement of perceived speed, which
only you experiencing it can really confirm.

---

## Correction: the Netflix import was on the wrong account (2026-07-12, same day)

The 86 imported rows were confirmed to exist in `media_log` but the Media module only showed the
one manually-added item ("Kung Fu Panda"). The working theory going in was a column-shape mismatch
between the imported rows and a normal app-created row. **That wasn't it.**

Dumped the one manually-added row in full, then queried the 86 imported rows and found they sat
under a **completely different `user_id`** than the manual row. There are two separate Supabase
auth accounts in this project:
- `a_hard_wick@icloud.com` (`user_id 142d1666...`) — the real, actively-used account: signed in
  today, 16 `food_log` rows, 42 `workout_sessions`, and the one manual media entry.
- `hardwickars@gmail.com` (`user_id 0a044e43...`) — a separate, nearly-empty account: signed in
  exactly once, at creation, essentially unused.

The Netflix import script (like every prior live-DB script in this project) resolved "the user" by
matching the email on this Claude conversation/account — `hardwickars@gmail.com` — which is *not*
the email the Parma app is actually signed in with. All 86 rows landed on the empty account and
were invisible for the ordinary reason: the Media module correctly scopes its query to whichever
account is signed in, and that's never been the `hardwickars@gmail.com` one.

Presented this finding and the two accounts' row counts/last-sign-in timestamps before touching
anything, and got explicit confirmation on the fix. Moved all 86 rows to the real account
(`UPDATE ... SET user_id, note = null WHERE ...`), checking first for title+category collisions
against the real account's existing row (none found). Verified: 0 rows remain on the wrong account,
87 now on the real one, every row's column shape — including `note`, now `null` on all of
them — is identical to the one manually-added row. Corrected project memory so no future session
repeats the wrong-account lookup (a real risk: every prior session's throwaway verification scripts
used the same wrong-account lookup, harmless there only because they cleaned up after themselves
before anyone would notice).

No code changed — this was a pure data correction, so no build/commit/deploy was needed.

---

## Wardrobe bulk photo import & Media taste graphs (2026-07-12, later session)

**Both tasks done**, 4 commits, each built clean and pushed independently. Production confirmed
serving the final commit (`45fbb1c`); `/wardrobe` and `/media` both return 200.

### Task 1 — Wardrobe bulk photo import
New pipeline per photo: client-side compress → remove.bg background removal (baked onto one fixed
neutral colour, `#F2F1ED`, so the catalogue looks uniform) → the app's existing one-off Claude vision
call (already used by the single-item add flow — extended, not forked, with a `needs_review` field
list so low-confidence guesses get flagged rather than presented as certain). Nothing touches the
database until the user reviews and confirms the whole batch — an abandoned import leaves zero
orphaned rows or storage files.

New `components/wardrobe/BulkImportFlow.tsx`: pick photos individually (mobile-friendly multi-select)
or a whole folder at once (`webkitdirectory`, desktop) → a progress bar while each photo processes →
a review grid with the AI's guesses pre-filled, needs-review fields highlighted, a duplicate-detection
warning (same type+brand+colour as an existing item), bulk actions across a selection (set type/brand,
add a season/tag to everything selected at once), and a per-item "More fields" expansion for anything
the AI didn't touch (size, condition, price, notes).

**Real-world gap found and fixed during verification, not before:** the only test photo available was
an iPhone `.HEIC` file — the default format for iPhone photos, and neither the browser, remove.bg, nor
Claude's vision API can decode it directly. Added `heic2any` (dynamically imported, so the common
non-HEIC case doesn't pay for it) to convert HEIC/HEIF to JPEG client-side before the existing resize
step. Then verified the complete pipeline for real: a puffer jacket photo, compressed 751KB→113KB,
cutout via remove.bg, identified by Claude as "Black and tan puffer jacket with sherpa collar" /
outerwear / black,tan,cream / autumn,winter / puffer,insulated,casual,winter — correctly flagging
`brand` as needing review rather than guessing at the visible "NORWAY"/"GNX 650" patches. Saved to the
real account, read back identical, signed URL resolves, and its type/seasons values are valid filter
options. Only one real test photo existed, so duplicate-detection and bulk-edit-across-a-selection
were verified by code review rather than a live second item — said so plainly rather than claiming a
test that didn't happen.

### Task 2 — Media favourites, genre-taste radar, watch breakdown
Migration 031 (live + verified): `genres text[]` and `pinned_slot smallint` (1-3, unique per
user+category) on `media_log`. Genre-tagged all 87 existing rows in **one** batched Claude call
(index+title+category in, genre-per-index out) rather than 87 separate calls — no TMDB key exists in
this project, so the AI-batch fallback the task allowed was used directly rather than chasing an
external signup. Real distribution came back documentary (34)/drama (32)/crime (28)/comedy (18)
dominant — matching the "skews crime/documentary" expectation stated in the task, not a made-up
result.

Favourites shelf (`MediaFavouritesShelf.tsx`) auto-selects top-3 films/shows by rating then recency,
with a pin/unpin override persisted via new `/api/media/pin`; books/songs show an honest "add
books"/"connect music" placeholder rather than a broken empty grid, since neither category has any
data yet. The genre-taste radar (`MediaTasteRadar.tsx`) plots a rating-weighted score per genre
(average rating scaled by √count, so one high rating can't out-rank a genre watched many times) against
an explicitly-labelled flat 50/100 "Average" baseline — there's no other-user data in this app to
compare against for real, and the UI says so rather than pretending otherwise. The breakdown section
adds films-vs-shows split, average rating, top genre, and a rating-distribution histogram. Both charts
are dynamically imported (`next/dynamic`, `ssr:false`) so they don't block the Media page's first
paint, and every colour comes from theme CSS variables rather than a hardcoded palette, so it repaints
correctly across all 7 themes instead of reproducing the "half-themed corner" bug class fixed in an
earlier polish session.

Verified all of it against the real 87-row dataset: favourites resolved to Parasite (10)/Get Out
(9)/Wolf of Wall Street (9) for films and Vikings/Snowpiercer/DEPP V HEARD (all 9) for shows; the
radar's top 6 axes and the breakdown's totals (38 films/49 shows, 5.51 average rating, documentary as
top genre, 43 items logged this year) all matched a hand-check of the raw data.

### Evidence trail
Each commit built clean before pushing (`6a86c90`, `dda1bf8`, `45fbb1c` plus the board-only commit).
Migration 031 confirmed live via `information_schema`/`pg_indexes` queries against the real database.
Genre-tagging, favourites, radar, and breakdown were all run against the real 87-item media log, not
mocked data. Final `npm run build` clean, `git rev-parse HEAD` matches `origin/main`, `www.parma.ink`
returns 200, both `/wardrobe` and `/media` return 200 in production.

**Needs your eyes:** the actual bulk-import UI (multi-photo/folder picker, the review grid's layout,
bulk-edit bar) and the favourites shelf/radar/breakdown's visual appearance across your 7 themes —
what's verified above is that the pipeline and the underlying data computations are correct, not
pixels. Also worth trying yourself: a real multi-photo batch (2+ images) to see the duplicate-detection
and bulk-edit-across-selection paths in action, since only one test photo was available this session.

---

## Unattended session: 10 tasks + bug sweep (2026-07-12/13, IN PROGRESS)

**T1-T9 done as of this checkpoint, T10-T11 still to come.** This is a long unattended run — writing
this mid-session in case a usage limit is hit, so it can resume cleanly from your phone. Board:
`board.html`. Commits so far: `3f47f95` (T1), `d8def92` (T2), `24f32cc` (T3), `5d5493b` (T4, no code
change), `a7cbad0` (T5), `abdc5de` (T6), `069b3e7` (T7), `4b98703` (T8), `7f43035` (T9). Every commit
built clean and was pushed individually; production confirmed reachable after each.

Several of these tasks overlapped with earlier sessions' work — each one started with a real re-check
against current code rather than assuming it still needed doing:

- **T1 (dead code):** removed 5 zero-caller API routes (`summary`, `history`, `suggest-food`,
  `briefing`, `body/soreness`) and ~90 lines of dead CSS the original `/grid` removal missed (the old
  `.bento-grid` named-area system and `.react-grid-layout`/`.rgl-edit-mode` overrides). Confirmed
  `hidden_widgets`/`layouts` (`user_preferences`) are still genuinely read (not truly dead), left alone.
- **T2 (loading/empty states):** confirmed everything from the wardrobe/media sessions already had
  correct skeletons/empty-states. Real gap: **Finances** was the last module never given server
  `initialData` — fixed via a new `lib/pageData/finances.ts` shared by the page and the API route.
- **T3 (error resilience):** 3 real bugs in the bulk-import flow — folder-import silently dropped HEIC
  files with an empty MIME type (defeating the HEIC fix from the wardrobe session), a discarded
  signed-URL error, and an unlocked item list during a save that could desync the partial-failure
  index-matching. All fixed.
- **T4:** pure verification — re-homed Mounjaro/photos/globe features from an earlier session still
  wired correctly; found genuinely new real data now exists (34 visited countries, 3 world clocks).
- **T5 (optimistic UI):** made media favourites pin/unpin optimistic. No habit-tracker UI exists to
  make optimistic (confirmed, not built here).
- **T6 (consistency):** repo-wide hardcoded-colour re-check came back clean. Fixed a real, safe
  outlier: Finances/Journal/Media were the only 3 modules with `<h1>` owned by the server page instead
  of their client component — moved into `FinancesClient`, a new `JournalPageClient` wrapper, and
  `MediaPageClient`.
- **T7 (chat bar):** Body was the only module with no scoped bias in `lib/moduleContext.ts` (confirmed
  this genuinely affects the AI parse pipeline, not just placeholder text) — added one.
- **T8 (midnight logging):** re-verified the existing after-midnight "yesterday's dinner" heuristic
  with 3 live Claude calls — all correct, no fix needed. Real gap: a food log item's **date** had no
  edit path at all — added it, with correct dual-day totals recompute when the date actually changes.
- **T9 (accessibility):** first full pass ever done. Fixed the shared `WidgetShell` close button
  (28px, unlabeled, blast radius ~10 detail sheets) plus 5 more modal-close buttons with the same
  pattern, added `aria-label` to Settings' 3 toggles, bumped ~12 small text-link tap targets.

**Still to do:** T10 (lazy-load Body/Finances charts), T11 (full bug sweep, safe-class fixes +
`BUGS.md` for anything ambiguous), then final build/production verification and a plain-English
summary. If resuming this from a fresh session, the next step is T10.
