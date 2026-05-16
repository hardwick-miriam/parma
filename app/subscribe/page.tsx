import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ArrowLeft, Check } from 'lucide-react'
import Link from 'next/link'
import SubscribeClient from '@/components/subscribe/SubscribeClient'
import Wordmark from '@/components/ui/Wordmark'

export const dynamic = 'force-dynamic'

export default async function SubscribePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('user_id', user.id)
    .single()

  const ink = '#d4cfc8'
  const dim = '#5a5048'
  const bdr = '#2a2218'

  return (
    <div className="min-h-screen" style={{ background: '#120d09' }}>
      <header className="border-b sticky top-0 z-20"
        style={{ background: 'rgba(12,8,5,0.97)', borderColor: bdr, backdropFilter: 'blur(10px)' }}>
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2" style={{ color: dim }}>
            <ArrowLeft size={14} />
            <span style={{ fontSize: '0.7rem', letterSpacing: '0.06em' }}>Dashboard</span>
          </Link>
          <div style={{ flex: 1 }} />
          <Wordmark size="sm" />
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {profile?.plan === 'premium' ? (
          <div style={{ textAlign: 'center', padding: '4rem 0' }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#1e2e1e', border: '1px solid #3a6a3a', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <Check size={20} color="#4a8a4a" />
            </div>
            <h2 style={{ fontFamily: 'var(--font-garamond)', fontSize: '1.5rem', color: ink, marginBottom: '0.5rem', fontWeight: 400 }}>You&rsquo;re already a Premium member</h2>
            <p style={{ color: dim, fontSize: '0.78rem' }}>Manage your subscription in <Link href="/settings" style={{ color: '#8a6a5a' }}>Settings</Link>.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'start' }}>
            {/* Left: pitch */}
            <div>
              <h1 style={{ fontFamily: 'var(--font-garamond)', fontSize: '2.4rem', fontWeight: 400, color: ink, letterSpacing: '0.04em', lineHeight: 1.2, marginBottom: '1rem' }}>
                Unlock the full library
              </h1>
              <p style={{ color: dim, fontSize: '0.85rem', lineHeight: 1.9, marginBottom: '2rem' }}>
                Premium gives you every tool for serious, sustained creative work — without limits.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  'Unlimited folders and documents',
                  'Character relationship map with portraits',
                  'Story timeline',
                  'Seasonal themes and custom accent colours',
                  'Epub and Word export',
                  'Collaboration and sharing',
                  'Public profile page',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#9a9088', fontSize: '0.8rem' }}>
                    <span style={{ color: '#6b2737', fontSize: '0.75rem', flexShrink: 0 }}>✦</span> {f}
                  </li>
                ))}
              </ul>
            </div>

            {/* Right: checkout */}
            <div style={{ background: '#1a1510', border: `1px solid ${bdr}`, borderRadius: 4, padding: '2rem' }}>
              <h2 style={{ color: dim, fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '1.5rem' }}>
                Choose a plan
              </h2>
              <SubscribeClient userEmail={user.email!} />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
