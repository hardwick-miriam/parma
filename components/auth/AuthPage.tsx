'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function AuthPage({ initialError }: { initialError?: string }) {
  const supabase = createClient()
  const [error, setError] = useState<string | null>(initialError ?? null)
  const [loading, setLoading] = useState(false)

  const signInWithGoogle = async () => {
    setError(null)
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    })
    if (error) {
      setError(error.message)
      setLoading(false)
    }
    // on success the browser redirects — no need to setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative"
      style={{ backgroundColor: '#1a1a1f' }}
    >
      {/* Filigree */}
      <svg aria-hidden="true" style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
        <defs>
          <pattern id="filigree-auth" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
            <g fill="none" stroke="rgba(192,192,192,0.07)" strokeWidth="0.5">
              <path d="M30 0 L60 30 L30 60 L0 30 Z" />
              <path d="M30 14 L46 30 L30 46 L14 30 Z" />
              <circle cx="30" cy="30" r="5" />
              <circle cx="0" cy="0" r="3.5" />
              <circle cx="60" cy="0" r="3.5" />
              <circle cx="0" cy="60" r="3.5" />
              <circle cx="60" cy="60" r="3.5" />
            </g>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#filigree-auth)" />
      </svg>

      <div
        className="w-full max-w-xs p-10 rounded-lg border flex flex-col items-center"
        style={{ background: '#2a2420', borderColor: '#3a3228', boxShadow: '0 8px 48px rgba(0,0,0,0.55)', position: 'relative', zIndex: 1 }}
      >
        {/* Crest */}
        <div className="mb-8 flex flex-col items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/crest.png"
            alt="Parma"
            style={{ height: 68, width: 'auto', filter: 'grayscale(1) invert(1)', mixBlendMode: 'screen', opacity: 0.72, objectFit: 'contain' }}
          />
          <p style={{ color: '#5a5048', fontSize: '0.65rem', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 300 }}>
            Parma
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded border text-sm"
          style={{ background: '#201d1a', borderColor: '#3a3228', color: loading ? '#5a5048' : '#d4cfc8', letterSpacing: '0.04em', fontWeight: 300, cursor: loading ? 'default' : 'pointer' }}
          onMouseEnter={(e) => { if (!loading) { e.currentTarget.style.borderColor = '#6b2737'; e.currentTarget.style.background = '#2d1520' } }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3a3228'; e.currentTarget.style.background = '#201d1a' }}
        >
          <GoogleIcon />
          {loading ? 'Redirecting…' : 'Sign in with Google'}
        </button>

        {error && (
          <p style={{ color: '#c0504a', fontSize: '0.7rem', marginTop: '1rem', textAlign: 'center', letterSpacing: '0.03em' }}>
            {error}
          </p>
        )}
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
