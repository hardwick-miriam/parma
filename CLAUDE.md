@AGENTS.md

# Parma

Personal health/life OS at **parma.ink**. Next.js 16 (App Router, Turbopack) + Supabase (Postgres/Auth/Storage/Realtime) + Vercel + Claude API (Anthropic SDK). Single-user-per-account: free-text logging → structured health/life data → a portrait-first module OS + AI insights.

## Architecture map

- **`app/(os)/`** — the single dashboard: `main` (command centre), plus one page per module (`food`, `health`, `gym`, `body`, `media`, `wardrobe`, `journal`, `finances`, `settings`). `app/(os)/layout.tsx` mounts the shared chrome once: `Sidebar`, `ContextualLogBar`, `PaletteWrapper` (⌘K), `RealtimeSync`, `OfflineQueue`. `/` and `/grid` both redirect here — the old bento dashboard (`DashboardGrid.tsx`, react-grid-layout, drag/resize/add-widget edit mode) was retired once every module was verified; only genuinely shared pieces (individual widget components, `WidgetDetailSheets.tsx` tap-to-detail sheets, `GridItemSizeContext`) survived the removal — see git history for `components/dashboard/DashboardGrid.tsx` if you need the old bento layout logic for reference.
- **`app/(dashboard)/`** — legacy top-nav chrome, now only serving `/insights` and `/review` (both standalone, not part of the module OS; own `NavBar.tsx`). `/` here is just a redirect to `/main`.
- `app/(auth)/` — login/signup. `proxy.ts` is the Next middleware: redirects unauthenticated users to `/login`, but explicitly excludes `api/sync-tick`, `api/whoop/webhook`, `api/cron/*` (machine callers, authenticate via secret, not session cookies).
- `app/api/*` — one route per feature/integration (parse-log, whoop/*, routine, sync-tick, cron/*, food, insights, query, review, share, push, shortcuts, transcribe, weather, world-clocks, countries, journal, media, photos, personal-records, theme, plus `main-summary`/`health-summary`/`gym-summary`/`body-summary` backing the module OS's live-refetch queries). Dead-code sweep removed 5 orphaned routes with zero callers (`summary`, `history`, `suggest-food`, `briefing`, `body/soreness`) — each was superseded by a direct server-side `lib/db/*` call from the relevant page instead.
- `components/dashboard/widgets/*` — one component per widget; most are rendered directly by a module page (e.g. `WhoopWidget` on Health, `BodyWidget` on Body) via `lib/pageData/*.ts` (server-fetched `initialData`) + a `useQuery` wrapper for live updates. `WidgetDetailSheets.tsx`'s `WidgetDetailRouter` (tap-to-detail sheets) is reused by `components/os/TappableWidget.tsx`.
- **Responsive content tiers**: `GridItemSizeContext`/`useGridItemSize()` gives each widget its `{w, h}` size — on a module page this comes from `ModulePageClient` (a fixed `h * 80px` wrapper, not organic sizing — see the "ModulePageClient collapsed height" note below). Each widget derives its own breakpoint (commonly a single `compact = w <= 2 || h <= 4` boolean, e.g. `WhoopWidget.tsx`) and renders less content as it shrinks. Rule: **cut content, not letters** — every widget must render without clipped/overflowing text at any size.
- **Theme system**: `ThemeProvider.tsx` — 7 themes (`normal`, `hacker`, `brutalism`, `old-money`, `dark-academia`, `midnight-ocean`, `synthwave`), stored in `user_preferences.theme`, set via `document.documentElement[data-theme]` + `POST /api/theme`. Background effects (`DigitalRain`, `FlyingBirds`, `ThemeParticles`) only render if `!prefers-reduced-motion` and (desktop OR user opted into `bgEffectsMobile`, persisted in `localStorage`).
- **NLP parse pipeline**: `LogInput.tsx` → `POST /api/parse-log` → 1) `chronoParseDate()` (`lib/chronoParse.ts`, chrono-node `casual` parser) pre-resolves relative dates locally as ground truth (rejects results >1 day in the future — treated as scheduling, not a log) → 2) Claude tool-use call (`lib/ai/providers/claude.ts`, model in `lib/ai/index.ts`) parses free text into every table at once (food, sleep, workouts, injuries, media, supplements, habits, weight, mood, countries, world clocks, mounjaro) → 3) `ParsedLogSchema` (zod, `lib/schemas.ts`) validates the AI's JSON before it ever touches the DB — reject with 502 on schema failure, never coerce silently → 4) `app/actions.ts:logEntry()` applies it. Voice input (`/api/transcribe`, Groq Whisper) feeds the same pipeline; **currently non-functional, `GROQ_API_KEY` unset**.
- **WHOOP integration** (`lib/whoop/client.ts`, `lib/whoop/sync.ts`): OAuth2 (scopes: profile/recovery/cycles/sleep/workout/body_measurement). Three sync paths, all converging on `syncWhoopUser(userId)`:
  1. **Webhook** `POST /api/whoop/webhook` — real-time push on `recovery.updated`/`sleep.updated`/`workout.updated`/`cycle.updated`. Validates HMAC via `WHOOP_WEBHOOK_SECRET` — **if unset, signature check is skipped and any unauthenticated POST is accepted** (fine for local dev, a real gap in prod).
  2. **`sync-tick`** `GET/POST /api/sync-tick` — external pinger (cron-job.org, free tier) hits this every 15 min since Vercel Hobby can't run sub-daily crons (see rule 7). Auth via `?secret=` or `Authorization: Bearer`, matched against `CRON_SECRET`. Skips a user if `last_sync_at` < 10 min old.
  3. **Manual** — Settings → WHOOP → Sync Now → same endpoint, current user only.
  Token refresh is transparent (refreshed if expiring within an hour, written back to `whoop_connections` before any data call). See `SYNC.md` for full detail and `/api/whoop/debug` for live token/sync-state introspection.
- **Exercise DB** (`lib/exerciseDb.ts`): 873 exercises from free-exercise-db (`lib/data/exercises.json`), Fuse.js fuzzy lookup (threshold 0.4) with a UK-alias table (`lib/data/exercise-aliases.json`) and a muscle→body-zone map (`lib/data/muscle-zone-map.json`) feeding `BodyWidget`'s anatomical SVG and `TrainingLoadWidget`'s ACWR calc.
- **Routine system**: `lib/routineParser.ts` — Claude tool-use (`parse_workout_routine`) turns free text or a pasted PDF dump into a named routine with per-day sessions (exercises/sets/reps/notes). Stored in `routines` (migration 014) as `sessions jsonb`, one row `is_active`. `components/settings/RoutineSection.tsx` + `app/api/routine/route.ts`.
- `lib/db/*` — one query module per domain (queries, whoop, mounjaro, journal, media, photos, preferences, history). `lib/supabase/{client,server,service}.ts` — anon-key client (user-facing, RLS-scoped) vs service-role client (`createServiceClient()`, bypasses RLS — cron/webhook/sync only).
- `supabase/migrations/001`–`016` — see gaps below.

## OUR WORKING RULES (learned the hard way)

1. **Migrations**: run every migration against live Supabase yourself using the service role key from `.env.local`. Never hand SQL to the user to paste into the SQL editor — chat mangles/truncates SQL in transit and produces silent corruption.
2. **No silent failures**: every Supabase write checks its error and surfaces it (thrown, logged, or returned to the caller) — never a bare `await supabase.from(...).insert(...)` with the result discarded.
3. **Commit AND push after each task**, then verify the **production** deployment actually serves the new code — check the GitHub Deployments API for the commit's deployment status, or probe a genuinely new route/string that only exists in the new code. A green `git push` or a clean local build is not evidence of a live deploy.
4. **Dates**: always via `getLocalDate()` / `Europe/London` (`lib/date.ts`, uses `date-fns-tz`). Never `new Date().toISOString().slice(0,10)` — that's UTC and silently shifts the "day" near midnight in the UK (BST vs GMT, and any user reasonably near a UTC day boundary).
5. **Keep AI usage cheap**: cheap/fast models for extraction-style calls, cache aggressively (see `food_cache` migration 015, Satori font cache, 24h insights cache), no vision APIs except explicitly pre-approved one-offs.
6. **Verify with evidence.** State what you actually observed, not what should be true. Never mark a task done without proof (build output, a live curl, a screenshot, a deployment ID) — see MORNING.md for the format this project already uses.
7. **Vercel Hobby plan**: only daily cron schedules are allowed. A sub-daily schedule in `vercel.json` **breaks all deploys on the project**, not just the cron. Sub-15-min WHOOP sync is handled by an external pinger (cron-job.org) hitting `/api/sync-tick`, not a Vercel cron. Current `vercel.json` crons: `sync-tick` at `0 6 * * *` (belt-and-braces daily, real cadence is the external pinger), `cron/insights-refresh` at `0 3 * * *`, and `cron/daily-briefing` at `0 7 * * *` (generates Main's cached daily briefing — Main only ever reads the cache, never calls Claude itself).
8. **For any task with 3+ steps, generate and live-update `board.html` first** — mandatory the same way committing is mandatory. Write every step as a `waiting` row up front with time/credit estimates, then flip each row to `working` → `done`/`failed` with actuals before starting the next step. Never batch board updates to the end.

## Env vars

| Var | Required | Notes |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | yes | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | yes | |
| `SUPABASE_SERVICE_ROLE_KEY` | yes | WHOOP sync, cron, webhook, migrations — bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | yes | OAuth callback base URL |
| `ANTHROPIC_API_KEY` | yes | all AI features (parse-log, insights, query, review, suggest-food, routine parse) |
| `WHOOP_CLIENT_ID` / `WHOOP_CLIENT_SECRET` | yes | WHOOP OAuth |
| `CRON_SECRET` | yes | protects `/api/sync-tick` and `/api/cron/*` |
| `WHOOP_WEBHOOK_SECRET` | optional but should be set | webhook signature check is **skipped entirely** if unset |
| `GROQ_API_KEY` | optional | voice transcription; currently unset → feature dead |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` / `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | optional | web push; generate with `webpush.generateVAPIDKeys()` |
| `AI_PROVIDER` | optional | defaults `claude`; `openai-compatible` path exists but is dead code |
| `OPENAI_COMPATIBLE_API_KEY` / `_BASE_URL` / `_MODEL` | optional | only used if `AI_PROVIDER=openai-compatible` |

## Known sharp edges

- **Service worker caching** (`public/sw.js`, registered by `SWRegister.tsx`): manually written, not Workbox (`@serwist/next` is incompatible with Turbopack). Network-first for `/api/` and `/auth/`, offline shell + push handling otherwise. If a deployed change isn't showing up for a user, suspect stale SW cache before suspecting the deploy.
- **`NEXT_PUBLIC_*` vars bake in at build time.** Changing one in Vercel does nothing until the next build/deploy — there is no way to hot-update them at runtime.
- **www vs non-www**: canonical domain is `parma.ink` (no www) — confirm the redirect direction in Vercel's domain settings before assuming both resolve identically; OAuth callback URLs and cookies are domain-sensitive.
- **8 tables have no `CREATE TABLE` in `supabase/migrations/`**: `user_preferences`, `health_status`, `injuries`, `injury_checkins`, `journal_notes`, `progress_photos`, `mounjaro_doses`, `mounjaro_effects` were created directly in Supabase. Running migrations 001→016 on a fresh DB fails at 002 (`ALTER`s `user_preferences` before it exists anywhere in-repo). If provisioning a new environment, this must be fixed first.
- **`RealtimeSync.tsx`** invalidates TanStack Query keys (not `router.refresh()` — that caused a full-route flash) per `lib/realtimeInvalidation.ts`'s table→key map, covering every table that backs a live query. A table must be in the `supabase_realtime` Postgres publication for this to fire at all — adding a new table to `TABLE_QUERY_KEYS` without also running `alter publication supabase_realtime add table ...` is a silent no-op (this bit us once already: 17 tables were missing from the publication for two full sessions before anyone noticed). Check `pg_publication_tables` when adding a new synced table.
- **`user_preferences.hidden_widgets`** is still read by Main/Health/Gym (`lib/pageData/*.ts`) to gate a few widgets, but its only write path (the old bento grid's edit-mode "hide" button) was removed with `/grid` — the column is effectively read-only now (whatever a user last set stays authoritative; there's no UI left to change it). `user_preferences.layouts` (react-grid-layout positions) is fully dead — only `/api/whoop/debug` still reads it, diagnostically.
- **No rate limiting** on any AI endpoint (`parse-log`, `insights`, `query`, `review`, `suggest-food`) — auth via Supabase session only, no per-user cost cap.
