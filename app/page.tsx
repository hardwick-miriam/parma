import { createClient } from '@/lib/supabase/server'
import AuthPage from '@/components/auth/AuthPage'
import SplashWrapper from '@/components/splash/SplashWrapper'

export default async function Home({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await searchParams

  return (
    <SplashWrapper authenticated={!!user}>
      <AuthPage initialError={error} />
    </SplashWrapper>
  )
}
