import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    console.error('[webhook] signature error:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const admin = createAdminClient()

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break

        const isActive = sub.status === 'active' || sub.status === 'trialing'
        const planType = sub.metadata?.plan_type as 'monthly' | 'annual' | undefined
        // In 2026-04-22.dahlia, current_period_end is on the SubscriptionItem
        const periodEnd = sub.items?.data?.[0]?.current_period_end

        await admin.from('profiles').upsert({
          user_id: userId,
          plan: isActive ? 'premium' : 'free',
          plan_type: isActive ? (planType || 'monthly') : null,
          plan_expires_at: isActive && periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
        }, { onConflict: 'user_id' })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const userId = sub.metadata?.supabase_user_id
        if (!userId) break
        await admin.from('profiles').update({
          plan: 'free', plan_type: null, plan_expires_at: null,
        }).eq('user_id', userId)
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: profiles } = await admin
          .from('profiles')
          .select('user_id')
          .eq('stripe_customer_id', customerId)
          .limit(1)
        if (profiles?.[0]) {
          await admin.from('profiles').update({ plan: 'free', plan_type: null }).eq('user_id', profiles[0].user_id)
        }
        break
      }
    }
  } catch (err) {
    console.error('[webhook] handler error:', err)
    return NextResponse.json({ error: 'Handler error' }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}
