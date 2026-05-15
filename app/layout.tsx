import type { Metadata, Viewport } from 'next'
import { Inter, EB_Garamond } from 'next/font/google'
import './globals.css'
import PWARegister from '@/components/PWARegister'

const inter = Inter({ subsets: ['latin'] })

const garamond = EB_Garamond({
  subsets: ['latin'],
  variable: '--font-garamond',
  weight: ['400', '500'],
  style: ['normal', 'italic'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Parma',
  description: 'A distraction-free writing app',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Parma',
  },
}

export const viewport: Viewport = {
  themeColor: '#1a1a1f',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${garamond.variable}`}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className={`${inter.className} min-h-full`}>
        <PWARegister />
        {children}
      </body>
    </html>
  )
}
