# WHOOP Sync Architecture

Parma pulls WHOOP data through two mechanisms: a real-time webhook and an external polling cron. Either alone keeps the dashboard current; together they are resilient to missed events.

## How data flows

### 1. Webhook (real-time)

WHOOP pushes events to `/api/whoop/webhook` whenever the user's device syncs:

| Event | Trigger |
|---|---|
| `recovery.updated` | New recovery score computed |
| `sleep.updated` | Sleep analysis finalised |
| `workout.updated` | Workout strain scored |
| `cycle.updated` | New physiological cycle opened |

The webhook handler validates the HMAC-SHA256 signature (`WHOOP_WEBHOOK_SECRET`), looks up the Parma user by `whoop_user_id`, then calls the appropriate sync function in `lib/whoop/sync.ts`. It always returns HTTP 200 so WHOOP does not retry on our error.

**To register the webhook with WHOOP**, POST to the WHOOP Developer API:
```
POST https://api.prod.whoop.com/developer/v1/webhook
Authorization: Bearer <your-access-token>
{
  "url": "https://parma.ink/api/whoop/webhook",
  "event_types": ["recovery.updated","sleep.updated","workout.updated","cycle.updated"]
}
```

Set `WHOOP_WEBHOOK_SECRET` in Vercel environment variables to match the secret returned by that call.

### 2. External polling cron (every 15 minutes) — cron-job.org recipe

The Vercel Hobby plan only allows daily cron schedules. Use **[cron-job.org](https://cron-job.org)** (free tier) to call `/api/sync-tick` every 15 minutes instead.

#### Step-by-step setup

1. Sign up at **cron-job.org** (free, no credit card).

2. Click **Create cronjob**.

3. Fill in the form:
   - **URL**: `https://parma.ink/api/sync-tick?secret=YOUR_CRON_SECRET`
     *(substitute your actual `CRON_SECRET` value from Vercel → Project → Environment Variables)*
   - **Schedule**: every 15 minutes  
     → select **Every minute** → set to `*/15` interval  
     (or use the expression `*/15 * * * *`)
   - **Method**: `GET`
   - **Request timeout**: 30 seconds
   - **Save responses**: enable (lets you debug failures in the dashboard)

4. Click **Create** and leave the cronjob enabled.

**That's it.** The endpoint accepts the secret via `?secret=` query parameter OR via `Authorization: Bearer` header — either works from cron-job.org.

#### Testing

To test immediately before setting up the cron, run:
```bash
curl "https://parma.ink/api/sync-tick?secret=YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "synced_users": 1,
  "skipped": 0,
  "failed": 0,
  "records": 3,
  "took_ms": 1240,
  "ts": "2026-06-29T06:00:00.000Z"
}
```

If `CRON_SECRET` is wrong you'll get `401 Unauthorized`.

#### Skip logic

If a user's `last_sync_at` is less than 10 minutes old, their sync is skipped and counted in `skipped`. This prevents hammering the WHOOP API if two cron triggers overlap (e.g., cron-job.org re-fires after a timeout).

### 3. Manual sync

Users can trigger an immediate sync from Settings → WHOOP Integration → Sync Now, which calls `POST /api/sync-tick`. Authenticated users only; syncs their own account only.

## Sync logic (`lib/whoop/sync.ts`)

`syncWhoopUser(userId)` does the following in order:

1. Reads `whoop_connections` for the user's access/refresh tokens
2. Refreshes the token if it expires within the next hour
3. Pulls the latest recovery, sleep, and workouts from the WHOOP API
4. Upserts into `whoop_data` and merges stats into `daily_stats`
5. Returns a summary object `{ recovery, sleep, workouts, error? }`

Token refresh is transparent — the new tokens are written back to `whoop_connections` before any data call.

## Environment variables

| Variable | Purpose |
|---|---|
| `WHOOP_CLIENT_ID` | OAuth app client ID (Vercel + .env.local) |
| `WHOOP_CLIENT_SECRET` | OAuth app client secret (Vercel + .env.local) |
| `WHOOP_WEBHOOK_SECRET` | HMAC secret for webhook signature validation |
| `CRON_SECRET` | Secret sent by the external cron with every request |

All four must be set in the Vercel Environment Variables dashboard. None are ever exposed client-side.

## Debugging

- **`/api/whoop/debug`** — shows the current token state and last sync timestamp for the authenticated user
- **cron-job.org dashboard** — shows execution history, HTTP status, and saved response bodies
- **Response fields explained**:
  - `synced_users` — accounts that were synced this tick
  - `skipped` — accounts skipped because last sync was < 10 min ago
  - `failed` — accounts where sync threw an error
  - `records` — total WHOOP data rows written
  - `took_ms` — wall-clock time for the entire request
- **`WHOOP_WEBHOOK_SECRET` unset** — the webhook skips signature validation and accepts all requests; safe for local dev, insecure in production
