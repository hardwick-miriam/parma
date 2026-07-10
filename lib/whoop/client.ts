import { createServiceClient } from '@/lib/supabase/service'
import { getWhoopConnection, upsertWhoopConnection } from '@/lib/db/whoop'
import type { WhoopConnection } from '@/lib/db/whoop'

export const WHOOP_BASE = 'https://api.prod.whoop.com/developer/v2'
const TOKEN_URL = 'https://api.prod.whoop.com/oauth/oauth2/token'
export const REVOKE_URL = 'https://api.prod.whoop.com/oauth/oauth2/revoke'
export const AUTH_URL = 'https://api.prod.whoop.com/oauth/oauth2/auth'
export const SCOPES = 'offline read:recovery read:sleep read:workout read:cycles read:profile'

export const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://parma.ink'

// ─── Token exchange ───────────────────────────────────────────────────────────

export async function exchangeCode(code: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
  token_type: string
}> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: `${APP_BASE_URL}/api/whoop/callback`,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WHOOP token exchange failed: ${res.status} ${text}`)
  }
  return res.json()
}

// ─── Token refresh ────────────────────────────────────────────────────────────

async function doRefresh(refreshToken: string): Promise<{
  access_token: string
  refresh_token: string
  expires_in: number
}> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    scope: SCOPES,
  })
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WHOOP token refresh failed: ${res.status} ${text}`)
  }
  return res.json()
}

// ─── Get valid (possibly refreshed) connection ────────────────────────────────

export async function getValidConnection(userId: string): Promise<WhoopConnection> {
  const conn = await getWhoopConnection(userId)
  if (!conn) throw new Error('Not connected to WHOOP')

  const expiresAt = new Date(conn.token_expires_at)
  const bufferMs = 5 * 60 * 1000 // refresh 5 min before expiry
  if (expiresAt.getTime() > Date.now() + bufferMs) {
    return conn
  }

  // Need to refresh
  const tokens = await doRefresh(conn.refresh_token)
  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const updated = await upsertWhoopConnection(userId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    token_expires_at: newExpires,
  })
  return updated
}

// ─── API helpers ──────────────────────────────────────────────────────────────

export async function whoopGet<T = unknown>(
  path: string,
  accessToken: string,
  params?: Record<string, string>
): Promise<T> {
  const url = new URL(`${WHOOP_BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`WHOOP GET ${path} failed: ${res.status} ${text}`)
  }
  return res.json() as Promise<T>
}

// ─── Paginated list helper ────────────────────────────────────────────────────

interface PagedResponse<T> {
  records: T[]
  next_token?: string
}

export async function whoopListAll<T = unknown>(
  path: string,
  accessToken: string,
  params: Record<string, string> = {}
): Promise<T[]> {
  const results: T[] = []
  let nextToken: string | undefined

  do {
    const queryParams = { ...params, limit: '25', ...(nextToken ? { nextToken } : {}) }
    const page = await whoopGet<PagedResponse<T>>(path, accessToken, queryParams)
    results.push(...(page.records ?? []))
    nextToken = page.next_token
  } while (nextToken)

  return results
}

// ─── Profile fetch ────────────────────────────────────────────────────────────

export interface WhoopProfile {
  user_id: number
  email: string
  first_name: string
  last_name: string
}

export async function getWhoopProfile(accessToken: string): Promise<WhoopProfile> {
  return whoopGet<WhoopProfile>('/user/profile/basic', accessToken)
}

// ─── Service-role token refresh (for cron/webhooks) ──────────────────────────

export async function getValidConnectionService(userId: string): Promise<WhoopConnection> {
  const supabase = createServiceClient()
  const { data: conn, error: readError } = await supabase
    .from('whoop_connections')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (readError) throw readError
  if (!conn) throw new Error('Not connected to WHOOP')

  const expiresAt = new Date(conn.token_expires_at as string)
  if (expiresAt.getTime() > Date.now() + 5 * 60 * 1000) {
    return conn as WhoopConnection
  }

  const tokens = await doRefresh(conn.refresh_token as string)
  const newExpires = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const { error: writeError } = await supabase
    .from('whoop_connections')
    .update({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      token_expires_at: newExpires,
    })
    .eq('user_id', userId)

  // C9: WHOOP rotates refresh tokens on every use — if this write silently
  // fails, the DB keeps the now-invalidated old refresh_token while we
  // return the new access_token as if it were persisted. The next refresh
  // then fails against WHOOP with an opaque error, breaking the
  // integration until the user manually reconnects. Throw so the caller
  // (sync/webhook) sees a clear "token persist failed" error instead.
  if (writeError) throw new Error(`Failed to persist refreshed WHOOP token: ${writeError.message}`)

  return { ...conn, access_token: tokens.access_token, token_expires_at: newExpires } as WhoopConnection
}
