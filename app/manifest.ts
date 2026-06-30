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
      { src: '/icon', sizes: '512x512', type: 'image/png' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any' },
    ],
  }
}
