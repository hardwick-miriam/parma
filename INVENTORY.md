# Parma — Feature Inventory
_Generated 2026-07-04. Covers code as it exists in the repo, not aspirations._

---

## 1. FEATURES

### NLP Log Input
**What it does:** Free-text entry parsed by Claude into structured data. A single message can log food, sleep, workouts, injuries, media, supplements, habits, weight, mood, countries visited, and world-clock cities simultaneously.  
**Tables:** `daily_stats`, `workout_sessions`, `injuries`, `injury_checkins`, `journal_notes`, `media_log`, `user_preferences`  
**Status:** WORKING  
**Path:** `LogInput.tsx` → `POST /api/parse-log` → `ClaudeProvider.parseLog()` (tool use) → `app/actions.ts:logEntry()`

---

### Voice Transcription
**What it does:** Mic button in LogInput records audio and converts to text via Groq Whisper, then passes to the NLP flow.  
**Tables:** None (upstream of log input)  
**Status:** STUB — `GROQ_API_KEY` not configured; endpoint `POST /api/transcribe` exists but fails at runtime  
**Path:** `LogInput.tsx` → `POST /api/transcribe` → Groq Whisper API

---

### Calories & Nutrition Widget
**What it does:** Shows today's calories and protein vs targets; tap to open NutritionDetail with 7-day history, log breakdown, and AI food suggestions.  
**Tables:** `daily_stats` (calories, protein_g), `log_entries`  
**Status:** WORKING

---

### Sleep Widget
**What it does:** Shows today's sleep hours vs 8h target; bar fill; shows WHOOP badge when data came from WHOOP sync.  
**Tables:** `daily_stats` (sleep_hours, sleep_source)  
**Status:** WORKING

---

### Steps Widget
**What it does:** Shows today's step count with bar and target.  
**Tables:** `daily_stats` (steps)  
**Status:** WORKING

---

### Hydration Widget
**What it does:** Shows water_ml today vs target.  
**Tables:** `daily_stats` (water_ml)  
**Status:** WORKING

---

### Mood Widget
**What it does:** Shows today's mood string; tap for 30-day mood history.  
**Tables:** `daily_stats` (mood)  
**Status:** WORKING

---

### Weight Widget
**What it does:** Shows today's weight vs goal; tap for 30-day trend.  
**Tables:** `daily_stats` (weight_kg), `user_preferences` (weight_goal_kg)  
**Status:** WORKING

---

### Workouts Widget
**What it does:** Lists today's workouts. WHOOP rows show a WHOOP badge + ⚡ icon and the actual start time from `started_at`; delete button hidden on WHOOP rows (they re-sync). Manual rows show feeling emoji and have a delete button.  
**Tables:** `workout_sessions` (source, whoop_id, started_at)  
**Status:** WORKING

---

### WHOOP Metrics Widget
**What it does:** Shows latest recovery score, HRV (rmssd), resting HR, strain, and sleep performance % from WHOOP.  
**Tables:** `whoop_metrics`  
**Status:** WORKING

---

### Supplements & Habits
**What it does:** Arrays on daily_stats; logged via NLP ("took vitamin D, did meditation"). Displayed in dashboard as tag lists with individual-remove buttons.  
**Tables:** `daily_stats` (supplements[], habits_done[])  
**Status:** WORKING

---

### Injury Tracker
**What it does:** Create injuries with description/body part; log recovery % check-ins; mark resolved. Displayed as active injury list with check-in history. Active injury count shown in NavBar.  
**Tables:** `injuries`, `injury_checkins`, `health_status`  
**Status:** WORKING

---

### Sick Status
**What it does:** NLP sets sick flag, onset date, and estimated days out. Shown as a banner in the dashboard.  
**Tables:** `health_status` (sick, sick_since, sick_estimated_days)  
**Status:** WORKING

---

### Journal
**What it does:** Freeform notes logged via NLP or direct entry; displayed in a scrollable journal widget.  
**Tables:** `journal_notes`  
**Status:** WORKING

---

### Progress Photos
**What it does:** Upload photos (stored in Supabase Storage); view and compare across dates.  
**Tables:** `progress_photos`, Supabase Storage bucket  
**Status:** WORKING

---

### Media Log
**What it does:** Log books, films, shows, songs with optional rating and note via NLP ("watched Dune, 9/10").  
**Tables:** `media_log`  
**Status:** WORKING

---

### Mounjaro / GLP-1 Tracker
**What it does:** Log injection doses and associated side-effects; displayed in MounjaroWidget.  
**Tables:** `mounjaro_doses`, `mounjaro_effects`  
**Status:** WORKING

---

### Metric Detail Views (Drill-Down)
**What it does:** Tap any metric widget to open a detail panel with charts/history. Six metric types implemented: nutrition, steps, sleep, hydration, weight, mood.  
**Tables:** `daily_stats` (via `getDailyStatsHistory`, 30-day window), `log_entries` (nutrition detail shows individual log entries)  
**Status:** WORKING  
**Path:** `DashboardGrid.tsx` → `DetailView.tsx` → per-metric detail components

---

### AI Insights
**What it does:** Generates a narrative summary of the past 7 days.  
**Tables:** `daily_stats` (7 days)  
**Status:** WORKING  
**Path:** `GET /api/insights` → `ClaudeProvider` → summary text

---

### AI Chat Query
**What it does:** Natural-language questions about your health data; Claude has context of recent daily_stats, workouts, and injuries.  
**Tables:** `daily_stats`, `workout_sessions`, `injuries`, `log_entries`  
**Status:** WORKING  
**Path:** `POST /api/query`

---

### Food Suggestions
**What it does:** Claude suggests meals or snacks based on today's remaining calorie/protein budget.  
**Tables:** `daily_stats` (today)  
**Status:** WORKING  
**Path:** `POST /api/suggest-food`

---

### Weekly Review / Reflection
**What it does:** AI-generated weekly reflection with themes and patterns.  
**Tables:** `daily_stats` (7 days), `workout_sessions`, `injuries`  
**Status:** WORKING  
**Path:** `POST /api/review`

---

### Streaks
**What it does:** Computes current logging streak from daily_stats continuity.  
**Tables:** `daily_stats`  
**Status:** WORKING  
**Path:** `lib/streaks.ts` → displayed in dashboard header/sidebar

---

### Milestones
**What it does:** Detects significant events (first workout, step records, streak lengths, etc.) and shows a toast notification.  
**Tables:** `daily_stats`, `workout_sessions`  
**Status:** WORKING  
**Path:** `lib/milestones.ts` → `MilestoneToast` in `DashboardGrid.tsx`

---

### World Clocks
**What it does:** Add cities via NLP ("add Tokyo to my world clocks"); displays a clock widget per city.  
**Tables:** `user_preferences` (world_clocks: jsonb array)  
**Status:** WORKING

---

### Countries Visited Map
**What it does:** Add countries via NLP ("I visited Japan"). Stored as ISO code array; rendered as a world map.  
**Tables:** `user_preferences` (visited_countries: text[])  
**Status:** WORKING  
**Path:** `app/actions.ts:logEntry()` → `GET /api/countries` (reads back the list)

---

### Weather Widget
**What it does:** Shows current temperature, weather condition, humidity, and wind speed with location name. Client sends lat/lon (from browser geolocation).  
**Tables:** None — stateless  
**Status:** WORKING  
**Path:** `GET /api/weather?lat=&lon=` → open-meteo.com + Nominatim reverse geocode (both free, no API key)

---

### Drag/Resize Layout
**What it does:** Dashboard widgets are drag-and-drop resizable (react-grid-layout). Layout persisted per user.  
**Tables:** `user_preferences` (layouts: jsonb)  
**Status:** WORKING

---

### Theme System
**What it does:** Four themes: normal, dark, hacker (DigitalRain animation), brutalism (FlyingBirds animation). Persisted per user.  
**Tables:** `user_preferences` (theme)  
**Status:** WORKING

---

### Realtime Sync
**What it does:** Supabase Realtime subscription triggers `router.refresh()` on any change to watched tables, keeping the dashboard live.  
**Tables watched:** `daily_stats`, `workout_sessions`, `log_entries`, `health_status`, `injuries`, `journal_notes`, `media_log`, `progress_photos`, `user_preferences`  
**Status:** WORKING (see KNOWN ROT — does not watch WHOOP tables)

---

### iOS Shortcuts Log
**What it does:** POST endpoint that accepts raw log text from iOS Shortcuts app and runs the same parse-and-apply flow.  
**Tables:** Same as NLP log input  
**Status:** WORKING  
**Path:** `POST /api/shortcuts/log`

---

### Settings Page
**What it does:** WHOOP connect/disconnect, manual sync button with result display (days synced, workouts, sleeps, errors). Profile info.  
**Tables:** `whoop_connections`  
**Status:** WORKING

---

## 2. INTEGRATIONS

### WHOOP API v2
**Scopes:** `read:profile read:recovery read:cycles read:sleep read:workout read:body_measurement`  
**Endpoints used:**
- `/oauth2/token` — OAuth token exchange and refresh
- `/v2/user/profile/basic` — display name on connect
- `/v2/recovery` — daily recovery scores (list, paginated)
- `/v2/cycle` — WHOOP cycles (list, paginated)
- `/v2/activity/sleep` — sleep sessions (list, paginated)
- `/v2/activity/workout` — workouts (list, paginated)
- `/v2/recovery/{cycleId}` — single recovery (webhook)
- `/v2/cycle/{cycleId}` — single cycle (webhook)
- `/v2/activity/sleep/{sleepId}` — single sleep (webhook)
- `/v2/activity/workout/{workoutId}` — single workout (webhook)

**Sync mechanism:**
- Manual: Settings button → `POST /api/whoop/sync`
- Nightly cron: 05:00 UTC → `GET /api/cron/whoop-sync`
- Webhook: `POST /api/whoop/webhook` (workout.updated, sleep.updated, recovery.updated, cycle.updated)

**Important:** WHOOP API v2 returns UUIDs for workout and sleep IDs, integers for cycle IDs only.

---

### Anthropic Claude
**Model:** `claude-sonnet-4-6`  
**Used for:**
- NLP log parsing (tool use with full ParsedLog schema — `POST /api/parse-log`)
- AI insights summary (`GET /api/insights`)
- Chat query (`POST /api/query`)
- Food suggestions (`POST /api/suggest-food`)
- Weekly review (`POST /api/review`)

**Provider abstraction:** `lib/ai/index.ts` checks `AI_PROVIDER` env var; defaults to `claude`. An `openai-compatible` path exists but is unused.

---

### Groq Whisper
**Used for:** Voice transcription in `POST /api/transcribe`  
**Status:** Non-functional — `GROQ_API_KEY` not set in `.env.local` or Vercel

---

### Open-Meteo + Nominatim
**Used for:** Weather widget (current conditions + reverse geocode for location name)  
**Auth:** None — both are free public APIs  
**Status:** WORKING

---

### Supabase
**Auth:** Email/password; `createClient()` for user-facing routes (anon key + session); `createServiceClient()` for background tasks (service role, bypasses RLS)  
**Database:** Postgres with RLS  
**Storage:** Progress photo uploads  
**Realtime:** 9-table subscription for live dashboard refresh  
**Status:** WORKING

---

## 3. INFRASTRUCTURE

### Authentication
- Supabase Auth (email/password)
- Session cookies managed by `@supabase/ssr`
- Server-side auth via `createClient()` in route handlers and server components
- Service client (`createServiceClient()`) used for: WHOOP sync, cron, webhook — bypasses RLS

### RLS Coverage
| Table | Policy in repo? | Coverage |
|-------|----------------|----------|
| `profiles` | Yes (001) | SELECT own, INSERT own |
| `daily_stats` | Yes (001) | FOR ALL, user_id = auth.uid() |
| `workout_sessions` | Yes (001) | FOR ALL, user_id = auth.uid() |
| `log_entries` | Yes (001) | FOR ALL, user_id = auth.uid() |
| `media_log` | Yes (002) | FOR ALL, user_id = auth.uid() |
| `whoop_connections` | Yes (004) | FOR ALL, user_id = auth.uid() |
| `whoop_metrics` | Yes (004) | FOR ALL, user_id = auth.uid() |
| `user_preferences` | **Unknown** | CREATE TABLE not in repo |
| `health_status` | **Unknown** | CREATE TABLE not in repo |
| `injuries` | **Unknown** | CREATE TABLE not in repo |
| `injury_checkins` | **Unknown** | CREATE TABLE not in repo |
| `journal_notes` | **Unknown** | CREATE TABLE not in repo |
| `progress_photos` | **Unknown** | CREATE TABLE not in repo |
| `mounjaro_doses` | **Unknown** | CREATE TABLE not in repo |
| `mounjaro_effects` | **Unknown** | CREATE TABLE not in repo |

### Migrations State
**Repo files:** `001_initial.sql` through `007_sleep_whoop_id_text.sql`  
**Live DB match:** Yes for the 7 files — all have been applied manually via Supabase SQL editor.  
**Gap:** 8 tables exist in the live DB (user_preferences, health_status, injuries, injury_checkins, journal_notes, progress_photos, mounjaro_doses, mounjaro_effects) with no CREATE TABLE in the repo. Migrations 002 and 003 ALTER `user_preferences` before it's ever created in-repo, so running the migrations from scratch on a fresh DB would fail on migration 002.

### Required Env Vars
| Var | Required? | Notes |
|-----|-----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Required | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Required | |
| `SUPABASE_SERVICE_ROLE_KEY` | Required | WHOOP sync, cron, webhook |
| `NEXT_PUBLIC_APP_URL` | Required | OAuth callback base URL |
| `ANTHROPIC_API_KEY` | Required | All AI features |
| `WHOOP_CLIENT_ID` | Required | WHOOP OAuth |
| `WHOOP_CLIENT_SECRET` | Required | WHOOP OAuth |
| `CRON_SECRET` | Required | Protects cron endpoint |
| `WHOOP_WEBHOOK_SECRET` | Optional | If unset, webhook auth is **skipped** |
| `GROQ_API_KEY` | Optional | Voice transcription — non-functional without it |
| `AI_PROVIDER` | Optional | Defaults to `claude` |
| `OPENAI_COMPATIBLE_API_KEY` | Optional | Only if `AI_PROVIDER=openai-compatible` |
| `OPENAI_COMPATIBLE_BASE_URL` | Optional | Only if `AI_PROVIDER=openai-compatible` |
| `OPENAI_COMPATIBLE_MODEL` | Optional | Only if `AI_PROVIDER=openai-compatible` |

### Crons
| Schedule | Path | What it does |
|----------|------|-------------|
| `0 5 * * *` (05:00 UTC daily) | `/api/cron/whoop-sync` | Syncs all WHOOP-connected users in parallel |

Defined in `vercel.json`.

---

## 4. KNOWN ROT

### syncSleepById writes wrong table and wrong date
`lib/whoop/sync.ts:420` — the webhook handler for `sleep.updated` writes `sleep_performance_pct` to `whoop_metrics` only. It never updates `daily_stats.sleep_hours`. So individual webhook-triggered sleep events don't update what the user sees in the Sleep widget — only the bulk cron sync does. Additionally, it uses `cycleDate(sleep.start, ...)` while the bulk sync correctly uses `sleep.end` for the morning-woke-up date, creating a 1-day offset in the whoop_metrics row for webhook-triggered syncs.

### WHOOP_WEBHOOK_SECRET not enforced when absent
`app/api/whoop/webhook/route.ts:14` — `if (!secret) return true`. If `WHOOP_WEBHOOK_SECRET` is not set in env, any unauthenticated POST is accepted as a valid WHOOP event. The env var is optional in the table above, but leaving it unset is a real security gap in production.

### recomputeDailyStats clobbers WHOOP sleep data
`lib/db/queries.ts:348` — called when a log entry is deleted. Recomputes daily_stats entirely from `log_entries` and upserts the result, overwriting `sleep_hours`, `sleep_source`, and `whoop_sleep_id` with either null or a stale manual value. WHOOP-sourced sleep data is silently erased whenever the user deletes a log entry from that day.

### Voice transcription is dead
`/api/transcribe` exists; mic UI renders in `LogInput.tsx`. `GROQ_API_KEY` is not in `.env.local` (confirmed). Hitting the mic button fails at runtime with no graceful fallback displayed to the user.

### OpenAI-compatible provider is dead code
`lib/ai/openai-compatible.ts` + `AI_PROVIDER` branch in `lib/ai/index.ts` are functional in isolation but unreachable at runtime (env always defaults to `claude`). Three extra env vars (`OPENAI_COMPATIBLE_*`) are documented but unused.

### RealtimeSync doesn't watch WHOOP tables
`components/RealtimeSync.tsx` subscribes to 9 tables but not `whoop_metrics` or `whoop_connections`. After a cron sync or webhook event updates WHOOP data, the dashboard doesn't refresh — the user must reload manually to see new recovery scores or workouts.

### 8 tables have no CREATE TABLE in repo
user_preferences, health_status, injuries, injury_checkins, journal_notes, progress_photos, mounjaro_doses, mounjaro_effects were created directly in Supabase and are not tracked in the migrations directory. Running the migration files on a fresh database fails at `002_life_vault.sql` (which ALTERs user_preferences before it exists). A new developer or environment has no documented path to reproduce the full schema.

### log_entries date filtering inconsistency
`getTodayLogEntries` filters on the `date` column (DB default, always populated). `recomputeDailyStats` filters on a `logged_at` timestamp range. Rows inserted before `logged_at` was added to the insert call have `logged_at = NULL` and are missed by recomputeDailyStats but correctly shown by getTodayLogEntries.

### No rate limiting on AI endpoints
`/api/parse-log`, `/api/insights`, `/api/query`, `/api/review`, `/api/suggest-food` are authenticated via Supabase session but have no per-user rate limits. Any signed-in user can fire unlimited Claude requests; cost controls are entirely absent.

---

## 5. TABLE LIST

### Tables with CREATE TABLE in repo migrations

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | 1:1 with auth.users; auto-created on signup; anchor for cascading deletes | In use |
| `daily_stats` | One row per user per day: calories, protein, steps, water, mood, sleep, weight, supplements[], habits_done[]. Now also: sleep_source, whoop_sleep_id | In use |
| `workout_sessions` | Workout log: description, duration, feeling, exercises[]. Now also: source (manual/whoop), whoop_id (UUID), started_at | In use |
| `log_entries` | Raw NLP input text + Claude-parsed JSON; basis for daily_stats recompute on delete | In use |
| `media_log` | Books, films, shows, songs with category, title, rating, note | In use |
| `whoop_connections` | WHOOP OAuth tokens (access, refresh, expiry), whoop_user_id, last_sync_at | In use |
| `whoop_metrics` | Daily WHOOP rollup: recovery_score, hrv_rmssd_milli, resting_hr, strain, sleep_performance_pct | In use |

### Tables referenced by code, CREATE TABLE NOT in repo

| Table | Purpose | RLS known? |
|-------|---------|------------|
| `user_preferences` | Per-user config: layouts (jsonb), theme, world_clocks (jsonb), visited_countries (text[]), weight_goal_kg | Unknown |
| `health_status` | Sick/injury flags with onset date and estimated duration | Unknown |
| `injuries` | Active and resolved injury records with body_part, started_on, resolved_on | Unknown |
| `injury_checkins` | Per-injury recovery % logs with feeling_pct, activity, notes | Unknown |
| `journal_notes` | Freeform journal entries | Unknown |
| `progress_photos` | Photo upload records (file path refs into Supabase Storage) | Unknown |
| `mounjaro_doses` | GLP-1 injection log | Unknown |
| `mounjaro_effects` | GLP-1 side-effect log | Unknown |

### Supabase Storage
| Bucket | Purpose |
|--------|---------|
| `progress-photos` (inferred) | Progress photo binary storage, referenced by `progress_photos` table |
