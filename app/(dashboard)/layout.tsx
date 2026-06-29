import { createClient } from '@/lib/supabase/server'
import { SignOutButton } from '@/components/dashboard/SignOutButton'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen bg-bg">
      <header className="border-b border-border px-4 py-3 flex items-center justify-between max-w-5xl mx-auto">
        <span className="text-sm font-semibold text-text tracking-tight">Parma</span>
        <div className="flex items-center gap-4">
          {user?.email && (
            <span className="text-xs text-text-muted hidden sm:block">{user.email}</span>
          )}
          <SignOutButton />
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  )
}
