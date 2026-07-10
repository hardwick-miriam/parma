# Parma Bug Audit — 2026-07-10

Report only — nothing in this document has been fixed. Ordered by severity within each category. File+line references are accurate as of this commit (`e2428c8`).

**Addendum (2026-07-10, later session)**: C11 below was found and fixed during the wardrobe
feature build, not part of the original audit — see PROGRESS.md for detail.

---

## CRITICAL

### C11. `progress-photos` storage bucket: RLS enabled, zero policies — feature likely non-functional for real users
Found while building the wardrobe feature's storage bucket and comparing against the existing
pattern. `storage.objects` has row-level security **enabled** but had **no policies at all**
scoped to the `progress-photos` bucket, while `app/api/photos/route.ts` performs its upload and
both `createSignedUrl` calls through the anon/session-scoped client
(`lib/supabase/server.ts:createClient()`, not the service-role client). With RLS on and no
permissive policy, Postgres denies access to non-superuser roles by default — every real
(non-service-role) request against this bucket almost certainly failed, and only looked fine to
prior debugging because the service-role/superuser DB connection used for migrations and
manual checks bypasses RLS entirely.
**Fixed**: `supabase/migrations/023_progress_photos_storage_rls.sql` — 4 owner-scoped
`storage.objects` policies (select/insert/update/delete), gated on
`(storage.foldername(name))[1] = auth.uid()::text`, matching the `${user_id}/...` path
convention already used by `addProgressPhoto`. Run live and verified via `pg_policies`.

### C1. Missing RLS on 8 untracked tables — potential cross-user data leak
`user_preferences`, `health_status`, `injuries`, `injury_checkins`, `journal_notes`, `progress_photos`, `mounjaro_doses`, `mounjaro_effects` have no `CREATE TABLE`/`ENABLE ROW LEVEL SECURITY`/`CREATE POLICY` anywhere in `supabase/migrations/*.sql` (confirmed by exhaustive grep — the only hits are `ALTER TABLE ... ADD COLUMN` on `user_preferences`). Every other table in the repo (`profiles`, `daily_stats`, `workout_sessions`, `media_log`, `personal_records`, `muscle_soreness`, `routines`, `push_subscriptions`) has an explicit `ENABLE ROW LEVEL SECURITY` + `auth.uid() = user_id` policy sitting right next to its `CREATE TABLE`. The app writes to these 8 tables via the anon-key (RLS-scoped) client and relies entirely on app-level `user_id` filtering. Supabase tables default to **RLS disabled** unless explicitly toggled — if that's the case here, any authenticated user can read/write another user's injuries, journal notes, progress photos, health status, and Mounjaro dosing by guessing/enumerating a `user_id`.
**Cannot be confirmed from the repo alone — requires live check** (`select * from pg_policies where schemaname='public'` in Supabase, or Dashboard → Authentication → Policies) for all 8 tables.
Fix: verify live; if RLS is off, write and run (per rule 1, service-role key, not pasted SQL) `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` + matching `auth.uid() = user_id` policies for all 8, matching the pattern in `001_initial.sql`/`002_life_vault.sql`.

### C2. `saveLog()` and `/api/shortcuts/log` never re-validate against `ParsedLogSchema`
`app/actions.ts:saveLog` is a `'use server'` Server Action typed as `ParsedLog` (a plain TS interface, erased at runtime) — a real network endpoint any client can call directly with arbitrary JSON, bypassing the `ParsedLogSchema.safeParse` that `app/api/parse-log/route.ts:53` runs. This isn't just theoretical: it's the normal UI path — `components/dashboard/ConfirmationDrawer.tsx:33-45` lets the user hand-edit the parsed object before `saveLog` is called. `setNum()` (line 39-41) does raw `Number(val)` on a text input with no NaN/bounds check (a cleared/malformed field sends `NaN` straight to an `integer`/`numeric` Postgres column); `mood` is a free-text input even though the schema/DB expect an enum, and `daily_stats.mood` has no CHECK constraint, so garbage persists. `app/api/shortcuts/log/route.ts:36-72` is a second, fully separate entry point into the same Claude parse call that **never calls `ParsedLogSchema.safeParse` at all** — directly violating CLAUDE.md's stated hard rule ("reject with 502 on schema failure, never coerce silently").
Fix: run `ParsedLogSchema.safeParse` inside `saveLog` and inside `/api/shortcuts/log` before any DB write; clamp/validate numeric edits client-side in `ConfirmationDrawer`.

### C3. UTC "today" computation throughout the core data layer, contradicting CLAUDE.md's own rule 4
`new Date().toISOString().split('T')[0]` (UTC, not `Europe/London`) is used instead of `getLocalDate()` in ~10 call sites in `lib/db/queries.ts` and `lib/db/mounjaro.ts`, plus `lib/streaks.ts`:
- `lib/db/queries.ts:49` `getTodayStats`, `:64` `getTodayWorkouts`, `:112` `upsertDailyStats` default date, `:169` `upsertHealthStatus` (sick_since/injury_since), `:222` `insertWorkout`, `:245-259` `insertLogEntry` (`logged_at`), `:263` `getTodayLogEntries`, `:345` `insertInjuryCheckin`, `:451`/`:470` `removeSupplementFromToday`/`removeHabitFromToday`, `:489` `resolveInjuryById`
- `lib/db/mounjaro.ts:63,81` dose/effect date defaults
- `lib/streaks.ts:12-13,21-22,42-43` — deliberately mirrors the same UTC midnight "to stay consistent with `daily_stats.date`" — must be fixed together with `queries.ts`, not independently
- Also `app/(dashboard)/page.tsx:54` (`new Date().toLocaleDateString('en-US', {...})`, no timezone arg — wrong weekday/date server-side near midnight) and client-side equivalents in `DashboardGrid.tsx:651`, `Nudges.tsx:73`, `WhoopWidget.tsx:60`, `TrainingLoadWidget.tsx:29,72`, `MounjaroWidget.tsx:29`

Between 23:00–00:00 UTC (00:00–01:00 BST, i.e. right now in July under BST), the UK calendar day has already advanced but `toISOString()` still reports yesterday — workouts, injury checkins, Mounjaro doses, streak counts, supplement/habit removal, and the dashboard's date header all get filed under the wrong day for up to an hour after local midnight, while `daily_stats` (fed correctly from `getLocalDate(tz)` in the parse-log route) reports the *correct* day — so a single log entry mentioning food + a workout can split across two different calendar dates in different tables.
Fix: replace every listed call site with `getLocalDate()` (or `getLocalDate(tz)` where a timezone is available) from `lib/date.ts`.

### C4. `log_date` (backdating) is honored only by `daily_stats`; ignored by nearly every other writer
`saveLog` (`app/actions.ts:62-76`) threads `parsed.log_date` into `upsertDailyStats` correctly, but none of `insertWorkout`, `upsertHealthStatus`, `insertInjuryCheckin`, `insertMounjaroDose`/`upsertMounjaroEffects`, or `insertLogEntry` accept a date parameter — they all hardcode "today" (see C3). Worse, `insertMounjaroDose`/`upsertMounjaroEffects` upsert on `onConflict: 'user_id,taken_date'`/`'user_id,logged_date'` using today's date regardless of what the user actually said — logging "yesterday I took 5mg and felt sick" **overwrites today's real dose/effects row** instead of creating a row for the stated day.
Fix: thread `parsed.log_date` (resolved via `getLocalDate`) through to every one of these functions as an optional date parameter.

### C5. `mounjaro_side_effects` zod schema rejects the documented `0` value, discarding the entire log entry
`lib/ai/providers/claude.ts:90-93` documents `0` as meaningful for `nausea`/`appetite`/`energy` ("0=none", "0=no appetite", "0=exhausted"). `lib/schemas.ts:31-36` (`MounjaroSideEffectsSchema`) uses `z.number().min(1).max(10)`, excluding `0`. When Claude correctly returns `0` for "no nausea today," `ParsedLogSchema.safeParse` fails the **entire** parsed object — not just the side-effects sub-object — and the route 502s, silently discarding any food/workout/weight/etc. bundled in the same message.
Fix: change to `z.number().min(0).max(10)`.

### C6. `upsertDailyStats` — unchecked read before additive merge can zero out and overwrite real accumulated totals
`lib/db/queries.ts:114-119` — `select` before the additive merge of calories/protein/water/steps has no error captured. If the read silently fails, `existing` is `undefined`, the merge treats accumulated totals as 0, and the resulting `upsert` **overwrites the user's real accumulated daily stats with just today's increment**. This is the primary write path for every log entry.
Fix: check `error`, abort/throw on failure instead of proceeding with `existing = undefined`.

### C7. `recomputeDailyStats` — unchecked read + unchecked write can silently zero a day's stats
`lib/db/queries.ts:350-359` (read) and `:383-399` (write, `error` not even destructured) — on a transient DB error, `entries` becomes `undefined`, the summing loop runs zero times, and the function unconditionally upserts `calories=0, protein_g=0, steps=0, water_ml=0`, wiping a day's real stats. Called from `deleteLogEntry` (`app/actions.ts:273`) after every single log deletion, which treats it as success.
Fix: check both errors; abort without wiping stats on failure.

### C8. WHOOP webhook handlers — zero error capture on upserts, so failed syncs are ACKed as successful and never retried
`lib/whoop/sync.ts:426-455` (`syncRecoveryByCycleId`), `:457-474` (`syncSleepById`), `:476-503` (`syncWorkoutById`) each call `.upsert(...)` with no `data`/`error` capture at all. `app/api/whoop/webhook/route.ts:57-66` only catches *thrown* exceptions, but Supabase errors are returned, not thrown — a failed upsert is invisible, the webhook responds `{ok:true}`, and WHOOP (which only retries on non-2xx) never resends the event. Data silently never arrives.
Fix: check `error` in all three functions; return non-2xx (or log + alert) on write failure so WHOOP retries.

### C9. WHOOP token-refresh persistence — unchecked write can silently break the integration
`lib/whoop/client.ts:152-179` (`getValidConnectionService`) refreshes the OAuth token then writes the new `access_token`/`refresh_token`/`token_expires_at` back (`:169-176`) with no error captured. WHOOP rotates refresh tokens on use — if the DB write silently fails, the old (now-invalidated) refresh token remains stored while the function returns the new access token as if persisted. The *next* refresh attempt fails with an opaque WHOOP API error, breaking sync until the user manually disconnects/reconnects, with no log pointing at the real cause.
Fix: check `error`; throw/alert on failure rather than proceeding silently.

### C10. `PRTrackerDetail` field-name mismatch — PR values never render, looks like "no PRs" even when data exists
`components/dashboard/WidgetDetailSheets.tsx:403-436` (`PRTrackerDetail`) reads `pr.max_weight_kg`, `pr.max_reps`, `pr.logged_date`. The actual `/api/personal-records` response / `personal_records` table shape is `{ exercise, value, unit, reps, logged_at }` (confirmed against `PRTrackerWidget.tsx`, which uses the correct field names and displays data fine). Every field the detail sheet expects is `undefined`, so tapping into a PR shows only the exercise name — the weight/reps/date (the entire point of the feature) silently never appear, with no error indication.
Fix: update `PRTrackerDetail` to read `pr.value`/`pr.unit`/`pr.reps`/`pr.logged_at`.

---

## MAJOR

### M1. `upsertJournalNote` — completely unchecked write, returns fake success
`lib/db/journal.ts:23-38` captures no error at all; returns `null` on failure. `app/api/journal/route.ts:24-25` does `NextResponse.json({ note: result })` with an implicit 200 — client sees "saved" with `note: null`.

### M2. WHOOP disconnect — delete unchecked, reports success even if tokens remain live
`lib/db/whoop.ts:52-55` (`deleteWhoopConnection`) has no error capture; `app/api/whoop/disconnect/route.ts:27-30` unconditionally returns `{ success: true }`. User believes WHOOP is disconnected while access/refresh tokens remain active in the DB.

### M3. World clocks — upsert unchecked, write-then-fake-success
`app/api/world-clocks/route.ts:40-45` (`saveCities`) — no error captured; POST/DELETE (`:72-73,86-87`) return the "updated" city list regardless of whether the write actually persisted.

### M4. Routine "deactivate others" — unchecked, can produce multiple simultaneously-active routines
`app/api/routine/route.ts:86-92` (PUT) — the update that deactivates all other routines is unchecked. If it silently fails while the new routine's `is_active: true` write succeeds, two+ routines can end up active with no error surfaced.

### M5. `saveLog` — `visited_countries`/`world_clock_cities` upserts unchecked, silently dropped
`app/actions.ts:132-143, 145-171` — both `user_preferences` select/upsert pairs are entirely unchecked. `saveLog` still returns success at line 252 even if either write fails — parsed countries/cities from the log entry silently vanish while the rest of the entry appears to save fine.

### M6. Insights-refresh cron — unchecked writes + unconditional success counter
`app/api/cron/insights-refresh/route.ts:34-46` — `.delete()`/`.insert()` for `insights` unchecked, and `refreshed++` (`:47`) increments **regardless of whether the insert actually succeeded** — a genuine write-then-fake-success in a scheduled job with no human watching.

### M7. Sync-tick / whoop-sync cron — unchecked connections read masks failures as "nothing to sync"
`app/api/sync-tick/route.ts:27-29` and `app/api/cron/whoop-sync/route.ts:13-15` — unchecked `whoop_connections` select; on DB error, `connections` is falsy and the route returns `{synced: 0}`/200 for every user, indistinguishable from "no one needed syncing."

### M8. Auth callback — unchecked `exchangeCodeForSession`/`verifyOtp`
`app/auth/callback/route.ts:15-22` — both fire-and-forget. On failure the user is redirected to `next` (default `/`) as if signup/password-reset/email-change succeeded, when they're actually unauthenticated.

### M9. `WeatherDetail` fetches `/api/weather` with no `lat`/`lon` — renders blank with no error
`components/dashboard/WidgetDetailSheets.tsx:529-554` calls `fetch('/api/weather')` with no query params; the route requires `lat`/`lon` and 400s. The component only checks `!data` (falsy) to decide "still loading," but the 400 body is a truthy object, so it falls into the "loaded" branch where every stat is `undefined` and the sheet renders essentially empty with zero error indication.

### M10. `WeatherWidget` has no compact/size branch despite being resizable to `minW:2`
`components/dashboard/widgets/WeatherWidget.tsx` — no `useGridItemSize()` branch at all (unlike Steps/Sleep/Body/etc. which all correctly implement the project's "cut content not letters" convention). Fixed `text-4xl` temp, a 3-column forecast grid, and multi-line detail rows all render unconditionally; at `minW:2` (~180px cell on mobile) this is very likely to clip or overflow, and the outer wrapper has no `overflow-hidden`.

### M11. Push notification categories never read back — resets to "all enabled" every refresh
`components/settings/PushNotificationSettings.tsx:29-35` hardcodes `categories` to all-`true` on mount; `app/api/push/subscribe/route.ts` has **no GET handler**, so the `categories` JSON that's POSTed is never fetched anywhere. Any category the user turns off silently reappears on next refresh, and the next save re-enables it server-side too.

### M12. Theme — DB value is effectively write-only for initial page load on a new browser/device
`setTheme()` writes to both `user_preferences.theme` and a `parma-theme` cookie, but `app/layout.tsx:54-55` reads **only** the cookie to initialize `ThemeProvider` — it never falls back to the DB value. `app/(dashboard)/settings/page.tsx` fetches `prefs.theme` from the DB and passes it as `initialPrefs.theme`, but `SettingsClient` never actually uses that prop (reads from `useTheme()`/cookie instead) — the prop is dead. A new browser/device or cleared cookies always shows `'normal'` even though the DB has the real saved theme.

### M13. `insertWorkout` not passed `logDate` from `saveLog` — a single log entry can split across two dates
`app/actions.ts` calls `insertWorkout` without a date argument even though `saveLog` already resolves the correct local date for `upsertDailyStats` in the same call. A message like "yesterday I did legs and ate X" can log the workout under today while food/calories land under yesterday.

### M14. `calories`/`duration_minutes` not integer-constrained in zod vs `integer` DB columns
`lib/schemas.ts:44` (`calories: z.number().nonnegative().optional()`, no `.int()`, contrast with `steps` which correctly has `.int()`) and `ParsedWorkoutSchema.duration_minutes` (`lib/schemas.ts:7`) — a fractional LLM-estimated value passes zod validation, then Postgres throws `invalid input syntax for type integer` on insert, surfacing as an opaque failure for an otherwise-valid log.

### M15. `mood`/`feeling` enums have no DB CHECK constraint — zod is the only enforcement, and multiple paths bypass zod
`daily_stats.mood` and `workout_sessions.feeling` are plain `text` columns with no CHECK constraint, unlike `media_log.category`/`media_log.status` which do have matching CHECKs (`002_life_vault.sql:10`, `011_media_status.sql:4`). Combined with C2 (paths that skip zod validation), invalid values can and do reach the DB.

### M16. Duplicate hand-maintained `ParsedLog` type vs zod schema can silently drift
`lib/ai/types.ts:27-61` hand-declares the `ParsedLog` interface structurally mirroring `lib/schemas.ts`'s `ParsedLogSchema` with no import relationship enforcing sync. Every consumer (`ConfirmationDrawer`, `DashboardGrid`, `DetailView`, `LogFlow`, `LogInput`, `PaletteWrapper`, `app/actions.ts`, `lib/db/queries.ts`, `/api/shortcuts/log`) imports the hand-written interface, not `z.infer<typeof ParsedLogSchema>`. A future field added to the schema but not mirrored here will type-check everywhere while being functionally absent.

### M17. `/api/shortcuts/log` reimplements `saveLog` but silently drops most field coverage
`app/api/shortcuts/log/route.ts:36-72` writes only `daily_stats`/`workout_sessions`/`health_status`/`mounjaro_doses`/`mounjaro_effects`. It does **not** handle `media`, `countries_visited`, `world_clock_cities`, `muscle_soreness`, `injury_checkin`, `injury_resolved`, or new-injury creation — Claude parses these fields (stored verbatim in `log_entries.parsed_json`) but they never materialize into their real tables when logged via Apple Shortcuts.

### M18. `openai-compatible` AI provider badly out of sync with the schema (dead code today, landmine if ever enabled)
`lib/ai/providers/openai-compatible.ts:28` — system prompt requests only 9 of ~28 `ParsedLogSchema` fields, missing `weight_kg`, `habits_done`, sick/injury fields, `media`, `countries_visited`, `world_clock_cities`, all `mounjaro_*`, `log_date`, `muscle_soreness`, `estimates`. Relies on free-form `JSON.parse` rather than tool-use schema. CLAUDE.md already flags this as dead code via `AI_PROVIDER` env var — confirmed and worse than expected if anyone flips it on.

### M19. World Clocks detail sheet points to a feature that doesn't exist there
`components/dashboard/WidgetDetailSheets.tsx:611` — tells the user "Add cities in Settings → Saved Places," but Settings' "Saved places" is for Apple Shortcuts location-triggered logging, unrelated to world clocks. Cities are actually added via "+ Add city" inside `WorldClocksWidget` itself.

### M20. Duplicate/orphaned `WorldMapWidget` component
Not imported/rendered anywhere in `DashboardGrid.tsx` (only `GlobeWidget`/`GlobeGL` are wired up) — appears to be a leftover 2D `react-simple-maps` implementation superseded by the 3D globe, independently managing the same "visited countries" state via `/api/countries`. Confirm unused before deleting.

### M21. Additional unchecked Supabase calls (secondary features)
- `lib/db/queries.ts:171-175` `upsertHealthStatus` select unchecked; `:452-457/461-465` `removeSupplementFromToday` and `:471-476/480-484` `removeHabitFromToday` — selects unchecked, final updates don't even destructure `error` — silent no-op deletes possible.
- `lib/db/queries.ts:406-413` `deleteLogEntryById` select unchecked — real DB errors surface identically to "not found."
- `lib/whoop/sync.ts:167-172` sync-window lookup unchecked (self-healing but masks failure); `:286-293` `existingSession` lookup unchecked — on failure can overwrite manually-logged exercises with a routine guess.
- `lib/whoop/client.ts:152-160` initial connection select unchecked — DB errors surface as generic "Not connected to WHOOP" across sync/webhook/cron paths.
- `app/api/whoop/webhook/route.ts:41-45` `conn` lookup unchecked — DB errors treated identically to "unknown WHOOP user," webhook silently dropped.
- `app/api/push/subscribe/route.ts:42-46` (DELETE) — both branches unchecked, always returns `{ok:true}`.

### M22. `estimates` field extracted and validated but never consumed
`lib/ai/providers/claude.ts:140-144`, `lib/schemas.ts:70` define `estimates: string[]`; no UI component reads `.estimates` anywhere — wasted extraction with no "~estimated" treatment ever implemented.

### M23. Atomic whole-log failure on one bad array element
`countries_visited` (`z.string().length(3)`), `media[].rating`, `muscle_soreness[].intensity` are bounded only in zod, not in the Claude tool JSON schema — one malformed element fails the *entire* `ParsedLogSchema.safeParse`, discarding unrelated food/workout/etc. bundled in the same message (same failure mode as C5, lower-frequency triggers).

---

## MINOR

### N1. Console-error-and-continue pattern (masks real DB errors as empty states)
`lib/db/journal.ts:12-20` `getJournalNotes`; `lib/db/whoop.ts` `getWhoopConnection`(34), `upsertWhoopMetrics`(84), `getWhoopMetrics`(102), `getLatestWhoopMetrics`(121), `getWhoopConnectionByWhoopUserId`(134); `lib/db/photos.ts:41-52` (pre-delete select + storage `.remove()` unchecked, can orphan storage objects); `app/api/food/route.ts:11-49` (cache read/write); `app/api/review/route.ts:23-29` (surfaces as "not enough data" instead of failure); `app/api/shortcuts/log/route.ts:18-22` (fails closed as 401, at least not a data-loss risk); `app/api/insights/route.ts:15-20,36-48`; `app/api/photos/route.ts:17-20,55-57,71-72`; `lib/pushNotify.ts:64`; `app/api/share/route.tsx:234-241`; `app/actions.ts:198-222` + `app/api/body/soreness/route.ts:36-63` (muscle soreness multiplier, logged-and-continue, low impact as it's a derived weighting value).

### N2. `bgEffectsMobile` persisted only to `localStorage`, not `user_preferences`
`components/ThemeProvider.tsx:38,47-48,66-69` — survives same-browser refresh but silently diverges from every other setting (all server-persisted) and won't follow the user across devices.

### N3. Remaining widget-level UTC date-key builders (cosmetic off-by-one-bucket near midnight)
`HeatmapWidget.tsx:50`, `HabitGardenWidget.tsx:7`, `SleepDebtWidget.tsx:9`, `WidgetDetailSheets.tsx:159,442`, `TrainingLoadWidget.tsx:29,72`, `WhoopWidget.tsx:60`, `MounjaroWidget.tsx:29`, `Nudges.tsx:73,99`, `SummaryCard.tsx:28`, `ShareButton.tsx:38`, `ProgressPhotos.tsx:50` — all build "last N days" or "is today" via `toISOString().split('T')[0]`. Mostly mislabels the rightmost chart column/highlight near local midnight rather than losing data.

### N4. Swallowed fetch errors → misleading "no data" empty states (not hangs, just wrong message)
`InsightsWidget.tsx:54-63` and `InsightsDetail` (`WidgetDetailSheets.tsx:223-246`) — `.catch(() => {})` with no error state, so a failed fetch shows "No strong patterns found yet" indistinguishable from genuinely insufficient data. Same pattern in `RoutineSection.tsx:210-218` ("No routines saved yet" on fetch failure). `ProgressPhotos` is the one component that does this correctly (visible `error` string) — worth using as the template.

### N5. `BodyWidget` injury-to-muscle matching is fragile string heuristics
`components/dashboard/widgets/BodyWidget.tsx:438-443` — matches a tapped muscle to an injury by checking whether `injury.body_part` (lowercased free text) `includes` the first word of the muscle's label. Any injury logged with different wording than the muscle label (e.g. "shoulder" vs "Rear Delt") fails to surface in the popover even though an active injury exists for that muscle.

### N6. Detail sheets have no loading timeout/retry
`GlobeDetail`/`WeatherDetail`/`InsightsDetail`/`PRTrackerDetail` (`WidgetDetailSheets.tsx`) show a bare "Loading…" with no timeout or retry affordance, unlike the main `WeatherWidget` which implements a proper error/retry flow.

### N7. Mobile (390px): widgets missing compact branches, violating the project's own size-tier convention
None of the following call `useGridItemSize()` / branch on size, despite sitting in the same resizable grid as compliant widgets (Steps, Sleep, Body, Nutrition, etc.):
- `WorldClocksWidget.tsx` — "+ Add city" input row (input + Add + Cancel + error text) has no wrap fallback at `minW:3`.
- `MediaWidget.tsx` — `grid-cols-2` counts + last-logged row render unconditionally at `minW:2`.
- `SupplementsWidget.tsx` — lower risk, flex-wrap naturally reflows, but no explicit size-based hiding.
- `InsightsWidget.tsx` — strength badge + truncated title row can overflow at narrow widths (no `min-w-0`).
- `PRTrackerWidget.tsx` — PR row (name + value + date + ShareButton) and the add-PR form (`w-20`, `w-12` fixed-ish widths) don't shrink further at `minW:2`.
- `TrainingLoadWidget.tsx` — 14 daily bars + day labels become unreadably thin rather than reducing bar count at small widths.
- `HabitGardenWidget.tsx` — hard `maxWidth:120`/`height:140` plant SVG container can force the card taller than its grid cell or clip.
- `HabitsWidget.tsx` — habit rows (checkmark + name + timestamp + remove) have no truncation fallback for long names.

### N8. Known, already-documented gaps confirmed still live (not new discoveries, listed for completeness)
- Voice transcription (`/api/transcribe`) — confirmed returns 503 "not configured" since `GROQ_API_KEY` is unset; `LogInput.tsx:157-176` has a Web Speech API fallback specifically to cover this dead path.
- No rate limiting on any AI endpoint (`parse-log`, `insights`, `query`, `review`, `suggest-food`) — combined with C2's unauthenticated-bypass risk on `/api/shortcuts/log`, this is an unbounded-Anthropic-spend exposure, not just a documented limitation.
- WHOOP webhook signature check skipped entirely if `WHOOP_WEBHOOK_SECRET` is unset (per CLAUDE.md) — confirmed live in `app/api/whoop/webhook/route.ts`.
- `updateLastSync` in `lib/db/whoop.ts:57-63` appears to have no callers (dead code) — unchecked write, but likely moot until re-wired.

### N9. No literal TODO/FIXME/HACK/XXX comments found in application source
Full-repo grep (excluding `node_modules`/`.next`/`.git`) found zero genuine hits — the few matches were false positives (`package-lock.json` base64 hash, a CSS theme name comment "HACKER theme", and "hack squat"/"hack press" exercise names in the exercise DB). Project debt is tracked in prose (`CLAUDE.md`/`MORNING.md`) rather than inline comments; those items are folded into N8 above.

---

## Summary counts

- **Critical: 10** (C1–C10)
- **Major: 23** (M1–M23, several are multi-site)
- **Minor: 9 groups** (N1–N9, several are multi-site)

## Suggested fix order

1. Verify RLS live on the 8 untracked tables (C1) — highest blast radius, pure verification, no code change needed to check.
2. Fix the UTC-date family (C3, C4, M13) together in one pass — same root cause (`lib/db/queries.ts`, `lib/db/mounjaro.ts`, `lib/streaks.ts`), same fix (`getLocalDate()`).
3. Add schema re-validation to `saveLog`/`shortcuts/log` (C2) and fix the `mounjaro_side_effects` bound (C5) — both are "silently discards a whole log entry" bugs.
4. Fix the three unchecked-write data-loss bugs in the stats pipeline (C6, C7) and WHOOP webhook/token paths (C8, C9).
5. Fix `PRTrackerDetail` field names (C10) — a one-line, high-visibility fix.
6. Sweep the Major list's unchecked-Supabase-write items (M1–M8, M21) — mechanical, same shape as C6–C9.
