import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(_request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('user_id', user.id)
      .single()

    if (!profile?.stripe_customer_id || profile.plan !== 'premium') {
      return NextResponse.json({ error: 'No active subscription' }, { status: 400 })
    }

    // Find and cancel active subscriptions for this customer
    const subs = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    })

    if (subs.data.length > 0) {
      // Cancel at period end so they keep access until paid period is over
      await stripe.subscriptions.update(subs.data[0].id, { cancel_at_period_end: true })
    }

    const admin = createAdminClient()
    await admin.from('profiles').update({ plan: 'free', plan_type: null }).eq('user_id', user.id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[cancel-subscription]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
