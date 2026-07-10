import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono, Playfair_Display, Libre_Baskerville } from 'next/font/google'
import { cookies } from 'next/headers'
import { ThemeProvider } from '@/components/ThemeProvider'
import { QueryProvider } from '@/components/QueryProvider'
import { Toaster } from 'sonner'
import { SWRegister } from '@/components/SWRegister'
import { createClient } from '@/lib/supabase/server'
import { getUserPreferences } from '@/lib/db/preferences'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
})

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
})

const libreBaskerville = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-libre',
  display: 'swap',
})

export const viewport: Viewport = {
  themeColor: '#8b5cf6',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export const metadata: Metadata = {
  title: 'Parma',
  description: 'Personal health & habit dashboard',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Parma',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  let theme = cookieStore.get('parma-theme')?.value

  // The cookie is absent on a new browser/device/cleared-cookies, even
  // though the user's real saved theme is in user_preferences.theme — fall
  // back to the DB so it isn't effectively write-only outside this one
  // browser. Only worth the round trip when there's no cookie to trust.
  if (!theme) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const prefs = await getUserPreferences(user.id)
        theme = prefs?.theme
      }
    } catch {
      // Not authenticated / DB unavailable — fall through to default
    }
  }
  theme ??= 'normal'

  const fontVars = [
    inter.variable,
    jetbrainsMono.variable,
    playfair.variable,
    libreBaskerville.variable,
  ].join(' ')

  return (
    <html lang="en" className={`h-full ${fontVars}`} data-theme={theme} suppressHydrationWarning>
      <body className="min-h-full">
        <ThemeProvider initialTheme={theme}>
          <QueryProvider>
            {children}
            <SWRegister />
            <Toaster
              position="bottom-center"
              offset={{ bottom: 140 }}
              toastOptions={{
                style: {
                  background: 'var(--surface-elevated)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--color-text)',
                  borderRadius: '16px',
                },
              }}
            />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
