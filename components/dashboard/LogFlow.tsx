'use client'

import { useState } from 'react'
import { LogInput } from './LogInput'
import { ConfirmationDrawer } from './ConfirmationDrawer'
import { QnAResult } from './QnAResult'
import { saveLog } from '@/app/actions'
import type { ParsedLog } from '@/lib/ai/types'

export function LogFlow() {
  const [pending, setPending] = useState<{ text: string; parsed: ParsedLog } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [qna, setQna] = useState<{ question: string; answer: string | null; loading: boolean } | null>(null)

  function handleParsed(text: string, parsed: ParsedLog) {
    setPending({ text, parsed })
    setSaveError(null)
  }

  async function handleQuestion(question: string) {
    setQna({ question, answer: null, loading: true })
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const data = await res.json()
      setQna({ question, answer: data.answer ?? data.error ?? 'No answer.', loading: false })
    } catch {
      setQna({ question, answer: 'Could not connect — check your network.', loading: false })
    }
  }

  async function handleConfirm(edited: ParsedLog) {
    if (!pending) return
    const result = await saveLog(pending.text, edited)
    if (result.error) {
      setSaveError(result.error)
    } else {
      setPending(null)
    }
  }

  function handleDiscard() {
    setPending(null)
    setSaveError(null)
  }

  return (
    <>
      <LogInput onParsed={handleParsed} onQuestion={handleQuestion} />
      {saveError && <p className="text-red-400 text-xs mt-2">{saveError}</p>}
      {pending && (
        <ConfirmationDrawer
          rawText={pending.text}
          parsed={pending.parsed}
          onConfirm={handleConfirm}
          onDiscard={handleDiscard}
        />
      )}
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
