'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

function GoogleIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}

function OrnamentDivider() {
  return (
    <svg viewBox="0 0 320 20" width="320" height="20" style={{ display: 'block', margin: '0 auto' }}>
      <line x1="0" y1="10" x2="128" y2="10" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
      <path d="M138 10 C144 4, 156 4, 162 10 C156 16, 144 16, 138 10" fill="none" stroke="rgba(192,144,80,0.5)" strokeWidth="0.5"/>
      <circle cx="160" cy="10" r="2" fill="none" stroke="rgba(192,144,80,0.4)" strokeWidth="0.5"/>
      <path d="M158 10 C164 4, 176 4, 182 10 C176 16, 164 16, 158 10" fill="none" stroke="rgba(192,144,80,0.5)" strokeWidth="0.5"/>
      <line x1="192" y1="10" x2="320" y2="10" stroke="rgba(192,144,80,0.3)" strokeWidth="0.5"/>
    </svg>
  )
}

function FeatureIcon({ path }: { path: string }) {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(181,150,78,0.7)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <path d={path} />
    </svg>
  )
}

const FEATURES = [
  {
    icon: 'M12 20h9M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z',
    title: 'The Writing Room',
    desc: 'A full-screen A4 parchment editor that disappears around your words. Dark and light modes, reading mode, and a page stack that shows how far you\'ve come.',
  },
  {
    icon: 'M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5',
    title: 'Worldbuilding',
    desc: 'Characters with portraits, status, and faction groupings on a living relationship map. Locations, lore, and a story timeline — the tools of the serious writer.',
  },
  {
    icon: 'M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z',
    title: 'Share & Collaborate',
    desc: 'Share documents with readers via private links. Invite co-authors. Publish your work to a public profile. Everything on your terms.',
  },
]

const FREE_FEATURES = ['3 folders', '5 documents per folder', 'Full writing editor', 'PDF export', 'Dark & light modes']
const PREMIUM_FEATURES = ['Unlimited folders & documents', 'Character relationship map', 'Story timeline', 'All seasonal themes', 'Epub & Word export', 'Collaboration & sharing', 'Public profile page', 'Priority support']

export default function LandingPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const signIn = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) { setError(error.message); setLoading(false) }
  }

  return (
    <div style={{ background: '#120d09', color: '#d4cfc8', fontFamily: 'Inter, sans-serif', overflowX: 'hidden' }}>

      {/* ── Hero ──────────────────────────────────────────────────────────────── */}
      <section style={{ position: 'relative', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem 2rem' }}>

        {/* Candlelight glow */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 50% 38%, rgba(180,100,20,0.28) 0%, rgba(120,55,8,0.16) 32%, transparent 65%)', pointerEvents: 'none' }} className="candle-flicker" />
        {/* Filigree */}
        <svg aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', opacity: 0.06 }}>
          <defs>
            <pattern id="fg" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <g fill="none" stroke="rgba(192,192,192,1)" strokeWidth="0.5">
                <path d="M30 0 L60 30 L30 60 L0 30 Z"/>
                <path d="M30 14 L46 30 L30 46 L14 30 Z"/>
                <circle cx="30" cy="30" r="5"/>
              </g>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#fg)"/>
        </svg>

        {/* Crest */}
        <div style={{ marginBottom: '2rem', position: 'relative', zIndex: 1 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/crest.png" alt="Parma" style={{ height: 96, width: 'auto', filter: 'grayscale(1) invert(1)', opacity: 0.82, objectFit: 'contain' }} />
        </div>

        {/* Wordmark */}
        <h1 style={{ fontSize: '3.5rem', fontFamily: 'var(--font-garamond)', fontWeight: 400, letterSpacing: '0.35em', textTransform: 'uppercase', color: '#e8dfc8', marginBottom: '1.25rem', position: 'relative', zIndex: 1, lineHeight: 1 }}>
          Parma
        </h1>

        {/* Tagline */}
        <p style={{ fontSize: '1.05rem', fontFamily: 'var(--font-garamond)', fontStyle: 'italic', color: 'rgba(192,144,80,0.75)', letterSpacing: '0.06em', marginBottom: '3rem', position: 'relative', zIndex: 1, textAlign: 'center' }}>
          Write like the candles are always lit.
        </p>

        {/* CTA */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <button onClick={signIn} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 28px', background: '#2d1520', border: '1px solid #6b2737', borderRadius: 3, color: loading ? '#5a5048' : '#d4cfc8', fontSize: '0.8rem', letterSpacing: '0.06em', cursor: loading ? 'default' : 'pointer' }}
            onMouseEnter={e => { if (!loading) { e.currentTarget.style.background = '#6b2737'; e.currentTarget.style.color = '#fff' } }}
            onMouseLeave={e => { e.currentTarget.style.background = '#2d1520'; e.currentTarget.style.color = '#d4cfc8' }}>
            <GoogleIcon />
            {loading ? 'Redirecting…' : 'Start writing — it\'s free'}
          </button>
          {error && <p style={{ color: '#c0504a', fontSize: '0.7rem' }}>{error}</p>}
          <p style={{ color: '#3a3228', fontSize: '0.62rem', letterSpacing: '0.08em' }}>
            No credit card required. Always free to start.
          </p>
        </div>

        {/* Scroll hint */}
        <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', color: '#2a2218', fontSize: '0.6rem', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          ↓
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────────────── */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '6rem 2rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <OrnamentDivider />
          <p style={{ marginTop: '2rem', color: '#5a5048', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase' }}>Everything a writer needs</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5rem' }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{ display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(181,150,78,0.08)', border: '1px solid rgba(181,150,78,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FeatureIcon path={f.icon} />
              </div>
              <div>
                <h3 style={{ fontFamily: 'var(--font-garamond)', fontSize: '1.3rem', fontWeight: 400, color: '#e8dfc8', marginBottom: '0.75rem', letterSpacing: '0.04em' }}>{f.title}</h3>
                <p style={{ color: '#6a5a48', fontSize: '0.85rem', lineHeight: 1.9, fontWeight: 300 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: '4rem' }}>
          <OrnamentDivider />
        </div>
      </section>

      {/* ── Pricing ──────────────────────────────────────────────────────────── */}
      <section style={{ background: '#0e0a07', padding: '6rem 2rem' }}>
        <div style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
            <p style={{ color: '#5a5048', fontSize: '0.62rem', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: '1rem' }}>Simple pricing</p>
            <h2 style={{ fontFamily: 'var(--font-garamond)', fontSize: '2rem', fontWeight: 400, color: '#e8dfc8', letterSpacing: '0.05em' }}>Begin free. Write seriously.</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Free */}
            <div style={{ background: '#1a1510', border: '1px solid #2a2218', borderRadius: 4, padding: '2rem' }}>
              <p style={{ color: '#5a5048', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Free</p>
              <p style={{ fontFamily: 'var(--font-garamond)', fontSize: '2.2rem', color: '#d4cfc8', marginBottom: '0.25rem' }}>£0</p>
              <p style={{ color: '#3a3228', fontSize: '0.7rem', marginBottom: '1.5rem' }}>Forever free</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {FREE_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5a5048', fontSize: '0.75rem' }}>
                    <span style={{ color: '#3a5a3a', fontSize: '0.7rem' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <button onClick={signIn}
                style={{ width: '100%', marginTop: '1.5rem', padding: '10px', background: 'transparent', border: '1px solid #2a2218', borderRadius: 3, color: '#5a5048', fontSize: '0.72rem', letterSpacing: '0.06em', cursor: 'pointer' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = '#3a3228'; e.currentTarget.style.color = '#9a9088' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2218'; e.currentTarget.style.color = '#5a5048' }}>
                Start free
              </button>
            </div>

            {/* Premium */}
            <div style={{ background: '#1e1412', border: '1px solid #6b2737', borderRadius: 4, padding: '2rem', position: 'relative' }}>
              <div style={{ position: 'absolute', top: -1, right: 16, background: '#6b2737', padding: '2px 10px', borderRadius: '0 0 3px 3px', fontSize: '0.58rem', letterSpacing: '0.12em', textTransform: 'uppercase', color: '#d4cfc8' }}>
                Premium
              </div>
              <p style={{ color: '#9a6070', fontSize: '0.62rem', letterSpacing: '0.18em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>Premium</p>
              <div style={{ marginBottom: '0.25rem' }}>
                <span style={{ fontFamily: 'var(--font-garamond)', fontSize: '2.2rem', color: '#e8dfc8' }}>£4.99</span>
                <span style={{ color: '#5a5048', fontSize: '0.7rem' }}> / month</span>
              </div>
              <p style={{ color: '#6b2737', fontSize: '0.68rem', marginBottom: '1.5rem' }}>or £47.99/year — saves ~20%</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {PREMIUM_FEATURES.map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#9a9088', fontSize: '0.75rem' }}>
                    <span style={{ color: '#6b2737', fontSize: '0.7rem' }}>✓</span> {f}
                  </li>
                ))}
              </ul>
              <Link href="/subscribe"
                style={{ width: '100%', marginTop: '1.5rem', padding: '10px', background: '#6b2737', border: '1px solid #8a3348', borderRadius: 3, color: '#fff', fontSize: '0.72rem', letterSpacing: '0.06em', cursor: 'pointer', display: 'block', textAlign: 'center', textDecoration: 'none' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#8a3348' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#6b2737' }}>
                Subscribe to Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #1e1812', padding: '2.5rem 2rem', textAlign: 'center' }}>
        <p style={{ color: '#2a2218', fontSize: '0.62rem', letterSpacing: '0.1em' }}>
          © {new Date().getFullYear()} Parma. Made for writers who take their craft seriously.
        </p>
      </footer>
    </div>
  )
}
