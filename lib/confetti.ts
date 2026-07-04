import type { Options as ConfettiOptions } from 'canvas-confetti'

// Respects prefers-reduced-motion — returns a no-op if motion is reduced
function shouldAnimate(): boolean {
  if (typeof window === 'undefined') return false
  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// Read the current accent colour from CSS variable
function accentColour(): string {
  if (typeof document === 'undefined') return '#8b5cf6'
  return getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6'
}

export async function fireCelebration(opts?: Partial<ConfettiOptions>) {
  if (!shouldAnimate()) return
  const confetti = (await import('canvas-confetti')).default
  const accent = accentColour()

  const shared: Partial<ConfettiOptions> = {
    particleCount: 80,
    spread: 70,
    colors: [accent, '#a78bfa', '#c4b5fd', '#ffffff', '#f9f5ff'],
    disableForReducedMotion: true,
    ...opts,
  }

  confetti({ ...shared, origin: { x: 0.3, y: 0.6 } })
  setTimeout(() => confetti({ ...shared, origin: { x: 0.7, y: 0.6 } }), 150)
}

export async function firePR() {
  if (!shouldAnimate()) return
  const confetti = (await import('canvas-confetti')).default
  const accent = accentColour()

  // Big burst for PRs
  confetti({
    particleCount: 150,
    spread: 100,
    origin: { x: 0.5, y: 0.5 },
    colors: [accent, '#a78bfa', '#c4b5fd', '#fbbf24', '#ffffff'],
    disableForReducedMotion: true,
  })
}
