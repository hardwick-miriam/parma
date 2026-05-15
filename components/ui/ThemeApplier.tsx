'use client'

import { useEffect } from 'react'

export default function ThemeApplier() {
  useEffect(() => {
    const theme = localStorage.getItem('parma-theme') || 'default'
    const accent = localStorage.getItem('parma-accent') || ''
    const font = localStorage.getItem('parma-font') || ''

    document.documentElement.setAttribute('data-theme', theme)

    if (accent) {
      document.documentElement.style.setProperty('--accent', accent)
    }

    if (font) {
      loadGoogleFont(font)
      document.documentElement.style.setProperty('--font-editor', `'${font}', Georgia, serif`)
    }
  }, [])

  return null
}

export function loadGoogleFont(family: string) {
  const id = `gf-${family.replace(/\s+/g, '-')}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:ital,wght@0,400;0,500;1,400&display=swap`
  document.head.appendChild(link)
}
