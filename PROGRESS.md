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
