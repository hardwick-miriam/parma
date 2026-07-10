@AGENTS.md

# Parma

Personal health/life OS at **parma.ink**. Next.js 16 (App Router, Turbopack) + Supabase (Postgres/Auth/Storage/Realtime) + Vercel + Claude API (Anthropic SDK). Single-user-per-account dashboard: free-text logging → structured health/life data → widget grid + AI insights.

## Architecture map

- `app/(dashboard)/` — main app: dashboard, insights, review, settings. `app/(auth)/` — login/signup. `proxy.ts` is the Next middleware: redirects unauthenticated users to `/login`, but explicitly excludes `api/sync-tick`, `api/whoop/webhook`, `api/cron/*` (machine callers, authenticate via secret, not session cookies).
- `app/api/*` — one route per feature/integration (parse-log, whoop/*, routine, sync-tick, cron/*, food, insights, query, review, share, push, shortcuts, transcribe, weather, world-clocks, countries, journal, media, photos, personal-records, body, theme, layout, history, summary).
- `components/dashboard/` — `DashboardGrid.tsx` is the core: `WIDGET_CATALOG` (id/name/description/icon per widget), `DEFAULT_LG`/`DEFAULT_SM` react-grid-layout layouts, `WidgetCatalogPanel` (add/remove widgets, persisted via hidden-widget-ids in `user_preferences`), `WidgetWrapper`/`PlainWrapper` (tap-anywhere-non-interactive → `DetailView`/`WidgetDetailSheets` drill-down).
- `components/dashboard/widgets/*` — one component per catalog entry.
- **Responsive content tiers**: `GridItemSizeContext`/`useGridItemSize()` gives each widget its live `{w, h}` grid-unit size. Each widget derives its own breakpoint (commonly a single `compact = w <= 2 || h <= 4` boolean, e.g. `StepsWidget.tsx`) and renders less content as it shrinks. Rule: **cut content, not letters** — every widget must render without clipped/overflowing text at every size it can be dragged to, from 2×3 up to full-width.
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
7. **Vercel Hobby plan**: only daily cron schedules are allowed. A sub-daily schedule in `vercel.json` **breaks all deploys on the project**, not just the cron. Sub-15-min WHOOP sync is handled by an external pinger (cron-job.org) hitting `/api/sync-tick`, not a Vercel cron. Current `vercel.json` crons: `sync-tick` at `0 6 * * *` (belt-and-braces daily, real cadence is the external pinger) and `cron/insights-refresh` at `0 3 * * *`.

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
- **`RealtimeSync.tsx`** watches 9 tables for live dashboard refresh but not `whoop_metrics`/`whoop_connections` — a WHOOP sync doesn't auto-refresh the dashboard; the user has to reload.
- **No rate limiting** on any AI endpoint (`parse-log`, `insights`, `query`, `review`, `suggest-food`) — auth via Supabase session only, no per-user cost cap.
