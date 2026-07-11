'use client'

import { useCallback, useState } from 'react'
import { CommandPalette } from '@/components/CommandPalette'
import { QnAResult } from '@/components/dashboard/QnAResult'
import { saveLog } from '@/app/actions'
import type { ParsedLog } from '@/lib/ai/types'

export function PaletteWrapper() {
  const [qna, setQna] = useState<{ question: string; answer: string; loading: boolean } | null>(null)

  const handleAskQuestion = useCallback(async (question: string) => {
    setQna({ question, answer: '', loading: true })
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setQna({ question, answer: data.error ?? 'Failed to get answer — try again.', loading: false })
        return
      }
      setQna({ question, answer: data.answer ?? 'No answer returned.', loading: false })
    } catch {
      setQna({ question, answer: 'Could not connect — check your network.', loading: false })
    }
  }, [])

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
    <>
      <CommandPalette
        onQuickLog={handleQuickLog}
        onAskQuestion={handleAskQuestion}
        onSyncWhoop={handleSyncWhoop}
      />
      {qna && (
        <QnAResult
          question={qna.question}
          answer={qna.answer}
          loading={qna.loading}
          onClose={() => setQna(null)}
        />
      )}
    </>
  )
}
