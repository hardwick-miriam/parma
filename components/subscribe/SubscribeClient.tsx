'use client'

import { useState, useEffect } from 'react'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import { useRouter } from 'next/navigation'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

type Plan = 'monthly' | 'annual'

function CheckoutForm({ userEmail }: { userEmail: string }) {
  const stripe = useStripe()
  const elements = useElements()
  const router = useRouter()
  const [paying, setPaying] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!stripe || !elements) return
    setPaying(true)
    setError(null)
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?subscribed=1`,
        payment_method_data: { billing_details: { email: userEmail } },
      },
      redirect: 'if_required',
    })
    if (result.error) {
      setError(result.error.message || 'Payment failed')
      setPaying(false)
    } else {
      router.push('/dashboard?subscribed=1')
    }
  }

  const bdr = '#2a2218'
  const ink = '#d4cfc8'
  const dim = '#5a5048'

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <PaymentElement options={{
        layout: 'tabs',
        fields: { billingDetails: { email: 'never' } },
      }} />
      {error && <p style={{ color: '#c0504a', fontSize: '0.72rem' }}>{error}</p>}
      <button type="submit" disabled={!stripe || paying}
        style={{ padding: '12px', background: paying ? '#2d1520' : '#6b2737', border: '1px solid #8a3348', borderRadius: 3, color: paying ? dim : '#fff', fontSize: '0.8rem', letterSpacing: '0.06em', cursor: paying ? 'default' : 'pointer' }}>
        {paying ? 'Processing…' : 'Subscribe now'}
      </button>
      <p style={{ color: '#2a2218', fontSize: '0.6rem', textAlign: 'center', letterSpacing: '0.06em' }}>
        Secured by Stripe · Cancel any time in Settings
      </p>
    </form>
  )
}

type Props = { userEmail: string }

export default function SubscribeClient({ userEmail }: Props) {
  const [plan, setPlan] = useState<Plan>('monthly')
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const bdr = '#2a2218'

  const createSubscription = async (p: Plan) => {
    setLoading(true)
    setClientSecret(null)
    setError(null)
    const res = await fetch('/api/stripe/create-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ planType: p }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.error || 'Failed to start checkout'); setLoading(false); return }
    setClientSecret(data.clientSecret)
    setLoading(false)
  }

  useEffect(() => { createSubscription('monthly') }, []) // eslint-disable-line

  const selectPlan = (p: Plan) => {
    setPlan(p)
    createSubscription(p)
  }

  const appearance = {
    theme: 'night' as const,
    variables: {
      colorPrimary: '#6b2737',
      colorBackground: '#1a1510',
      colorText: '#d4cfc8',
      colorDanger: '#c0504a',
      fontFamily: 'Inter, sans-serif',
      borderRadius: '3px',
      colorBorder: '#3a3228',
    },
  }

  return (
    <div style={{ maxWidth: 460, margin: '0 auto', width: '100%' }}>
      {/* Plan selector */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 28 }}>
        {([
          { key: 'monthly' as Plan, price: '£4.99', period: 'per month', note: '' },
          { key: 'annual' as Plan, price: '£47.99', period: 'per year', note: 'Saves ~20%' },
        ]).map(({ key, price, period, note }) => (
          <button key={key} onClick={() => selectPlan(key)}
            style={{
              padding: '14px 16px', borderRadius: 3, cursor: 'pointer', textAlign: 'left',
              background: plan === key ? '#2d1520' : 'transparent',
              border: `1px solid ${plan === key ? '#6b2737' : bdr}`,
            }}>
            <div style={{ fontFamily: 'var(--font-garamond)', fontSize: '1.4rem', color: ink, lineHeight: 1 }}>{price}</div>
            <div style={{ color: dim, fontSize: '0.65rem', marginTop: 4 }}>{period}</div>
            {note && <div style={{ color: '#6b2737', fontSize: '0.6rem', marginTop: 3 }}>{note}</div>}
          </button>
        ))}
      </div>

      {/* Stripe Elements */}
      {loading && <p style={{ color: dim, fontSize: '0.72rem', textAlign: 'center' }}>Preparing checkout…</p>}
      {error && <p style={{ color: '#c0504a', fontSize: '0.72rem', marginBottom: 12 }}>{error}</p>}
      {clientSecret && (
        <Elements stripe={stripePromise} options={{ clientSecret, appearance }}>
          <CheckoutForm userEmail={userEmail} />
        </Elements>
      )}
    </div>
  )
}
