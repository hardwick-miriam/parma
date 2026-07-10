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

### C5 — mounjaro_side_effects min(1) → min(0)
STARTING/DONE C5 — lib/schemas.ts MounjaroSideEffectsSchema now allows 0 for
nausea/appetite/energy, matching the tool schema's documented "0=none" meaning. Verified:
`npm run build` clean.
