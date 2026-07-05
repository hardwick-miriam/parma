'use client'

import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { DigitalRain } from './DigitalRain'
import { FlyingBirds } from './FlyingBirds'
import { ThemeParticles } from './ThemeParticles'

export type Theme = 'normal' | 'hacker' | 'brutalism' | 'old-money' | 'dark-academia' | 'midnight-ocean' | 'synthwave'

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
  bgEffectsMobile: boolean
  setBgEffectsMobile: (v: boolean) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'normal',
  setTheme: () => {},
  bgEffectsMobile: false,
  setBgEffectsMobile: () => {},
})

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
  const [bgEffectsMobile, setBgEffectsMobileState] = useState(false)

  useEffect(() => {
    setMounted(true)
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    // Restore mobile effects pref from localStorage
    const stored = localStorage.getItem('parma-bg-effects-mobile')
    if (stored === '1') setBgEffectsMobileState(true)
    return () => mq.removeEventListener('change', onChange)
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

  const setBgEffectsMobile = useCallback((v: boolean) => {
    setBgEffectsMobileState(v)
    localStorage.setItem('parma-bg-effects-mobile', v ? '1' : '0')
  }, [])

  const isMobile = mounted && typeof window !== 'undefined' && window.innerWidth < 768
  // On mobile, effects only run if the user enabled them AND reduced-motion is off
  const showEffects = mounted && !reduced && (!isMobile || bgEffectsMobile)

  const PARTICLE_THEMES: Theme[] = ['old-money', 'dark-academia', 'midnight-ocean', 'synthwave']

  return (
    <ThemeContext.Provider value={{ theme, setTheme, bgEffectsMobile, setBgEffectsMobile }}>
      {showEffects && theme === 'hacker'    && <DigitalRain reduced={reduced} />}
      {showEffects && theme === 'brutalism' && <FlyingBirds reduced={reduced} />}
      {showEffects && PARTICLE_THEMES.includes(theme) && (
        <ThemeParticles theme={theme} reduced={reduced} />
      )}
      {children}
    </ThemeContext.Provider>
  )
}
