'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function SWRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Listen for a new SW waiting
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing
            newWorker?.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                toast('New version available', {
                  description: 'Refresh to update',
                  action: { label: 'Refresh', onClick: () => window.location.reload() },
                  duration: Infinity,
                })
              }
            })
          })
        })
        .catch(() => {})
    })
  }, [])

  return null
}
