'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <Image
          src="/logo.png"
          alt="Parma"
          width={56}
          height={56}
          quality={100}
          className="mb-4"
          style={{ mixBlendMode: 'screen', borderRadius: 8 }}
          priority
        />
        <p className="text-text-muted text-sm mb-8">Sign in to your dashboard</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-muted uppercase tracking-wider">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl bg-surface border border-border text-text px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-text-muted uppercase tracking-wider">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl bg-surface border border-border text-text px-4 py-3 text-sm focus:outline-none focus:border-border-strong"
            />
          </label>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 py-3 rounded-xl bg-accent text-bg text-sm font-semibold disabled:opacity-50 hover:opacity-90 transition-opacity"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-xs text-text-muted mt-6">
          No account?{' '}
          <Link href="/signup" className="text-accent hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  )
}
