'use client'

import { useCallback } from 'react'
import { CommandPalette } from '@/components/CommandPalette'
import { saveLog } from '@/app/actions'
import type { ParsedLog } from '@/lib/ai/types'

export function PaletteWrapper() {
  const handleQuickLog = useCallback(async (text: string) => {
    try {
      const res = await fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          date: new Date().toLocaleDateString('en-CA'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')
      await saveLog(text, data.parsed as ParsedLog)
      window.dispatchEvent(new CustomEvent('parma:saved'))
    } catch (err) {
      console.error('[palette quick-log]', err)
    }
  }, [])

  const handleSyncWhoop = useCallback(async () => {
    try {
      await fetch('/api/whoop/sync', { method: 'POST' })
      window.dispatchEvent(new CustomEvent('parma:saved'))
    } catch (err) {
      console.error('[palette sync-whoop]', err)
    }
  }, [])

  return (
    <CommandPalette
      onQuickLog={handleQuickLog}
      onSyncWhoop={handleSyncWhoop}
    />
  )
}
