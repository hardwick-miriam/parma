'use client'

import { useEffect } from 'react'
import 'driver.js/dist/driver.css'

const TOUR_KEY = 'parma-onboarding-v1'

export function OnboardingTour() {
  useEffect(() => {
    const seen = (() => { try { return localStorage.getItem(TOUR_KEY) } catch { return null } })()
    if (seen) return

    let cancelled = false

    async function start() {
      // Lazy-load driver.js only when needed
      const { driver } = await import('driver.js')
      if (cancelled) return

      const driverObj = driver({
        animate: true,
        showProgress: true,
        progressText: '{{current}} of {{total}}',
        nextBtnText: 'Next →',
        prevBtnText: '← Back',
        doneBtnText: 'Done',
        popoverClass: 'parma-tour',
        steps: [
          {
            element: '[data-tour="log-input"]',
            popover: {
              title: 'Log anything',
              description: 'Type naturally — "2 eggs, oats, black coffee" or "ran 5km, felt great". Parma extracts every metric automatically.',
              side: 'bottom',
              align: 'start',
            },
          },
          {
            element: '[data-tour="command-palette"]',
            popover: {
              title: '⌘K for everything',
              description: 'Open the command palette to log quickly, navigate to any page, sync WHOOP, or change your theme.',
              side: 'bottom',
              align: 'end',
            },
          },
          {
            element: '[data-tour="dashboard-grid"]',
            popover: {
              title: 'Your command centre',
              description: "This is Main — your daily briefing, today's rings, and trends update automatically as you log. Tap any card to see the fuller picture.",
              side: 'top',
              align: 'start',
            },
          },
          {
            popover: {
              title: "You're all set",
              description: 'Start by logging your first entry. You can always ask Parma a question about your data — just type it into the log box.',
            },
          },
        ],
        onDestroyStarted: () => {
          try { localStorage.setItem(TOUR_KEY, '1') } catch {}
          driverObj.destroy()
        },
      })

      driverObj.drive()
    }

    // Small delay so the DOM is ready
    const t = setTimeout(start, 800)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  return null
}
