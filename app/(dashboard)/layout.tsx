import Image from 'next/image'
import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { LogFlow } from '@/components/dashboard/LogFlow'
import { NavBar } from '@/components/dashboard/NavBar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-bg" style={{ overflowX: 'hidden', width: '100%' }}>
      {/* Top nav bar — padding-top respects iOS status bar via safe-area-inset-top */}
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(17,17,19,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
          paddingTop: 'env(safe-area-inset-top)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-11 flex items-center gap-2 min-w-0">
          {/* Brand — never shrinks */}
          <Image
            src="/logo.png"
            alt="Parma"
            width={28}
            height={28}
            quality={100}
            className="shrink-0"
            style={{ mixBlendMode: 'screen', borderRadius: 4 }}
            priority
          />

          {/* Nav — scrollable on mobile so nothing clips */}
          <div
            className="nav-scroller flex-1 min-w-0 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <NavBar />
          </div>

          {/* Right actions — never shrinks */}
          <div className="shrink-0 flex items-center gap-2 pl-1">
            {user?.email && (
              <span className="text-xs text-text-subtle hidden sm:block">{user.email}</span>
            )}
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Scrollable content — top padding clears the header + status bar */}
      <main
        className="px-4 w-full min-w-0"
        style={{
          paddingTop: 'calc(2.75rem + env(safe-area-inset-top))',
          paddingBottom: 'calc(7.5rem + env(safe-area-inset-bottom))',
        }}
      >
        {children}
      </main>

      {/* Fixed floating log bar — padding-bottom clears the iOS home indicator */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          background: 'rgba(17,17,19,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
          paddingTop: '0.75rem',
          paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))',
        }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <LogFlow />
          <div className="mt-1.5 flex justify-end">
            <a
              href="/privacy"
              className="text-[10px] text-text-subtle hover:text-text-muted transition-colors"
            >
              Privacy
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
