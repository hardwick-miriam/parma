import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/os/Sidebar'
import { SignOutButton } from '@/components/dashboard/SignOutButton'
import { PaletteWrapper } from '@/components/dashboard/PaletteWrapper'
import { OfflineQueue } from '@/components/OfflineQueue'

export default async function OSLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-bg" style={{ overflowX: 'hidden', width: '100%' }}>
      <Sidebar />

      <div
        className="sm:pl-[var(--os-sidebar-w,208px)]"
        style={{ paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' }}
      >
        <header
          className="flex items-center justify-end gap-3 px-4 sm:px-6 h-12 sticky top-0 z-30"
          style={{
            background: 'rgba(17,17,19,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid var(--border)',
            paddingTop: 'env(safe-area-inset-top)',
          }}
        >
          <span className="text-xs text-text-subtle hidden sm:block">{user.email}</span>
          <SignOutButton />
        </header>

        <main className="px-4 sm:px-6 py-5 w-full min-w-0 max-w-6xl mx-auto">
          {children}
        </main>
      </div>

      <OfflineQueue />
      <PaletteWrapper />
    </div>
  )
}
