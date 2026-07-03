'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DigitalRain } from './DigitalRain'
import { FlyingBirds } from './FlyingBirds'

export type Theme = 'normal' | 'hacker' | 'brutalism' | 'old-money' | 'dark-academia'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({ theme: 'normal', setTheme: () => {} })

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeProvider({
  initialTheme,
  children,
}: {
  initialTheme: string
  children: React.ReactNode
}) {
  const [theme, setThemeState] = useState<Theme>((initialTheme as Theme) || 'normal')
  const [reduced, setReduced] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setReduced(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    document.documentElement.setAttribute('data-theme', t)
    fetch('/api/theme', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ theme: t }),
    }).catch(() => {})
  }, [])

  // Mobile: skip heavy background effects
  const isMobile = mounted && typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {mounted && !isMobile && theme === 'hacker' && <DigitalRain reduced={reduced} />}
      {mounted && !isMobile && theme === 'brutalism' && <FlyingBirds reduced={reduced} />}
      {children}
    </ThemeContext.Provider>
  )
}
