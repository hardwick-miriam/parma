import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { createServiceClient } from '@/lib/supabase/service'
import { syncRecoveryByCycleId, syncSleepById, syncWorkoutById } from '@/lib/whoop/sync'

type WebhookEvent = {
  type: string
  user_id: number
  id: string | number  // workout events use UUID strings; cycle/sleep/recovery use integers
}

async function validateSignature(request: NextRequest, body: string): Promise<boolean> {
  const secret = process.env.WHOOP_WEBHOOK_SECRET
  if (!secret) return true // Skip validation if not configured

  const signature = request.headers.get('x-whoop-signature')
  if (!signature) return false

  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(body)
  const expected = hmac.digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
}

export async function POST(request: NextRequest) {
  const body = await request.text()

  if (!await validateSignature(request, body)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: WebhookEvent
  try {
    event = JSON.parse(body) as WebhookEvent
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Look up the Parma user by WHOOP user_id
  const supabase = createServiceClient()
  const { data: conn, error: connErr } = await supabase
    .from('whoop_connections')
    .select('user_id')
    .eq('whoop_user_id', event.user_id)
    .maybeSingle()

  if (connErr) {
    console.error('WHOOP webhook connection lookup error:', connErr.message)
    // Return non-2xx so WHOOP retries — a DB error here previously looked
    // identical to "unknown WHOOP user" and silently dropped the event.
    return NextResponse.json({ error: 'Failed to look up connection' }, { status: 500 })
  }
  if (!conn) {
    // Not a known user — acknowledge and ignore
    return NextResponse.json({ ok: true })
  }

  const userId = conn.user_id as string

  try {
    switch (event.type) {
      case 'recovery.updated':
        await syncRecoveryByCycleId(userId, Number(event.id))
        break
      case 'sleep.updated':
        await syncSleepById(userId, String(event.id))
        break
      case 'workout.updated':
        await syncWorkoutById(userId, String(event.id))
        break
      case 'cycle.updated':
        await syncRecoveryByCycleId(userId, Number(event.id))
        break
      default:
        // Unknown event — ack without acting
    }
  } catch (err) {
    console.error(`WHOOP webhook error for ${event.type}:`, err)
    // C8: return non-2xx so WHOOP retries the delivery. Previously this
    // always returned 200 even on a failed write, so a transient DB error
    // silently dropped the event for good — the "nightly cron catches up"
    // assumption doesn't hold on Vercel Hobby, where the only sub-daily
    // sync path is the external pinger, not a cron job (see CLAUDE.md rule 7).
    return NextResponse.json({ error: 'Failed to process webhook event' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
