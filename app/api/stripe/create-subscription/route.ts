import { NextRequest, NextResponse } from 'next/server'
import { stripe, PRICES } from '@/lib/stripe'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

export async function POST(request: NextRequest) {
  try {
    const { planType } = await request.json() as { planType: 'monthly' | 'annual' }
    if (!planType || !PRICES[planType]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = createAdminClient()

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id, plan')
      .eq('user_id', user.id)
      .single()

    if (profile?.plan === 'premium') {
      return NextResponse.json({ error: 'Already subscribed' }, { status: 400 })
    }

    let customerId = profile?.stripe_customer_id
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email!,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id
      await admin.from('profiles').upsert(
        { user_id: user.id, stripe_customer_id: customerId },
        { onConflict: 'user_id' }
      )
    }

    // Create subscription with expanded invoice
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: PRICES[planType] }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice'],
      metadata: { supabase_user_id: user.id, plan_type: planType },
    })

    const invoice = subscription.latest_invoice as Stripe.Invoice
    // In Stripe API 2026-04-22.dahlia, client_secret is in confirmation_secret
    const clientSecret = invoice.confirmation_secret?.client_secret

    if (!clientSecret) {
      return NextResponse.json({ error: 'Could not retrieve payment client secret' }, { status: 500 })
    }

    return NextResponse.json({
      clientSecret,
      subscriptionId: subscription.id,
    })
  } catch (err) {
    console.error('[create-subscription]', err)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
