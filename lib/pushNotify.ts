import webpush from 'web-push'
import { createServiceClient } from '@/lib/supabase/service'

webpush.setVapidDetails(
  'mailto:hardwickars@gmail.com',
  process.env.VAPID_PUBLIC_KEY ?? '',
  process.env.VAPID_PRIVATE_KEY ?? '',
)

export type PushCategory = 'streak_risk' | 'session_reminder' | 'recovery_ready' | 'pr_celebration' | 'hydration'

export interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
}

// Quiet hours: 22:00–08:00 Europe/London
function isQuietHours(): boolean {
  const hour = new Date().toLocaleTimeString('en-GB', { timeZone: 'Europe/London', hour: 'numeric', hour12: false })
  const h = parseInt(hour, 10)
  return h >= 22 || h < 8
}

export async function sendPushToUser(
  userId: string,
  category: PushCategory,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (isQuietHours()) {
    console.log(`[push] quiet hours — skipping notification for ${userId}`)
    return { sent: 0, failed: 0 }
  }

  const supabase = createServiceClient()
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)

  if (error || !subs?.length) return { sent: 0, failed: 0 }

  let sent = 0, failed = 0

  for (const sub of subs) {
    const categories = sub.categories as Record<string, boolean> ?? {}
    if (categories[category] === false) continue

    const pushSub = {
      endpoint: sub.endpoint as string,
      keys: { p256dh: sub.p256dh as string, auth: sub.auth as string },
    }

    try {
      await webpush.sendNotification(pushSub, JSON.stringify({ ...payload, icon: '/logo.png', badge: '/logo.png' }))
      sent++
    } catch (err) {
      console.error('[push] sendNotification failed:', err)
      failed++
      // If subscription is invalid (410 Gone), remove it
      if ((err as { statusCode?: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('user_id', userId).eq('endpoint', sub.endpoint)
      }
    }
  }

  return { sent, failed }
}
