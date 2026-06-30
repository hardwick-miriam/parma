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
      {/* Top nav bar */}
      <header
        className="fixed top-0 left-0 right-0 z-40"
        style={{
          background: 'rgba(17,17,19,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-11 flex items-center gap-2 min-w-0">
          {/* Brand — never shrinks */}
          <span className="font-bold text-accent text-sm tracking-tight shrink-0 pr-1">parma</span>

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

      {/* Scrollable content */}
      <main
        className="max-w-5xl mx-auto px-4 pt-16 w-full min-w-0"
        style={{ paddingBottom: '120px' }}
      >
        {children}
      </main>

      {/* Fixed floating log bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 py-3"
        style={{
          background: 'rgba(17,17,19,0.92)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -4px 24px rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4">
          <LogFlow />
        </div>
      </div>
    </div>
  )
}
