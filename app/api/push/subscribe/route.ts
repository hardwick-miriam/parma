import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// The `categories` JSON column was write-only before this — nothing ever
// read it back, so the client's local state (defaulted to "everything on")
// silently reset on every page refresh regardless of what the user had
// actually saved.
export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const endpoint = request.nextUrl.searchParams.get('endpoint')
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 })

  const { data, error } = await supabase
    .from('push_subscriptions')
    .select('categories')
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)
    .maybeSingle()

  if (error) {
    console.error('[push/subscribe GET] error:', error.message)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }
  return NextResponse.json({ categories: data?.categories ?? null })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json() as {
    subscription: { endpoint: string; keys: { p256dh: string; auth: string } }
    categories?: Record<string, boolean>
  }

  if (!body.subscription?.endpoint || !body.subscription?.keys?.p256dh || !body.subscription?.keys?.auth) {
    return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 })
  }

  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: user.id,
    endpoint: body.subscription.endpoint,
    p256dh: body.subscription.keys.p256dh,
    auth: body.subscription.keys.auth,
    categories: body.categories ?? {},
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id, endpoint' })

  if (error) {
    console.error('[push/subscribe] upsert error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { endpoint } = await request.json() as { endpoint?: string }

  const { error } = endpoint
    ? await supabase.from('push_subscriptions').delete().eq('user_id', user.id).eq('endpoint', endpoint)
    : await supabase.from('push_subscriptions').delete().eq('user_id', user.id)

  if (error) {
    console.error('[push/subscribe DELETE] error:', error.message)
    return NextResponse.json({ error: 'Failed to remove subscription' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
