import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { LogFlow } from '@/components/dashboard/LogFlow'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-bg">
      {/* Sign-out — fixed top-right, unobtrusive */}
      <div className="fixed top-3 right-4 z-40 flex items-center gap-3">
        {user?.email && (
          <span className="text-xs text-text-subtle hidden sm:block">{user.email}</span>
        )}
        <SignOutButton />
      </div>

      {/* Scrollable content — padded so it clears the bottom log bar */}
      <main
        className="max-w-5xl mx-auto px-4 pt-6"
        style={{ paddingBottom: 'calc(var(--log-bar-height) + 32px)' }}
      >
        {children}
      </main>

      {/* Fixed floating log bar */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50"
        style={{
          height: 'var(--log-bar-height)',
          background: 'rgba(17,17,19,0.88)',
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 -8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div className="max-w-5xl mx-auto px-4 h-full flex items-center">
          <LogFlow />
        </div>
      </div>
    </div>
  )
}
