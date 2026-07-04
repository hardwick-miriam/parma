# WHOOP Sync Architecture

Parma pulls WHOOP data through two complementary mechanisms: a real-time webhook and a 15-minute polling cron. Either one alone keeps the dashboard current; together they are resilient to missed events.

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
  "url": "https://parma-seven.vercel.app/api/whoop/webhook",
  "event_types": ["recovery.updated","sleep.updated","workout.updated","cycle.updated"]
}
```

Set `WHOOP_WEBHOOK_SECRET` in Vercel environment variables to match the secret returned by that call.

### 2. Polling cron (every 15 minutes)

`/api/sync-tick` is called by Vercel Cron on `*/15 * * * *`. It:

1. Authenticates via `CRON_SECRET` in the `Authorization` header
2. Fetches all rows from `whoop_connections`
3. Calls `syncWhoopUser(userId)` for each connected account in parallel
4. Returns `{ users, succeeded, failed, ts }`

This cron catches any events the webhook missed (network blips, WHOOP retries, app restarts).

**Requires Vercel Pro plan** — the free tier only supports daily cron schedules. On a free plan the schedule silently degrades to once daily; set it to `0 5 * * *` if on free tier.

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
| `CRON_SECRET` | Bearer token Vercel sends with every cron request |

All four must be set in the Vercel Environment Variables dashboard. None are ever exposed client-side.

## Debugging

- **`/api/whoop/debug`** — shows the current token state and last sync timestamp for the authenticated user
- **Vercel logs** — each cron invocation logs `succeeded` / `failed` counts
- **`WHOOP_WEBHOOK_SECRET` unset** — the webhook skips signature validation and accepts all requests; safe for local dev, insecure in production
