import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Parma',
    short_name: 'Parma',
    description: 'Personal health & habit dashboard',
    start_url: '/',
    display: 'standalone',
    background_color: '#111113',
    theme_color: '#8b5cf6',
    icons: [
      { src: '/icon/192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
      { src: '/logo.png', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
  }
}
