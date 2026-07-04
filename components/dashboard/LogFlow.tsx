'use client'

import { useState, useEffect } from 'react'
import { LogInput } from './LogInput'
import { ConfirmationDrawer } from './ConfirmationDrawer'
import { QnAResult } from './QnAResult'
import { saveLog, deleteLogEntry } from '@/app/actions'
import type { ParsedLog } from '@/lib/ai/types'

export function LogFlow() {
  const [pending, setPending] = useState<{ text: string; parsed: ParsedLog; saveError?: string } | null>(null)
  const [qna, setQna] = useState<{ question: string; answer: string | null; loading: boolean } | null>(null)
  const [voiceToast, setVoiceToast] = useState<{ text: string; entryId: string | null } | null>(null)
  const [voiceParsing, setVoiceParsing] = useState(false)

  // Auto-dismiss voice toast after 5s
  useEffect(() => {
    if (!voiceToast) return
    const t = setTimeout(() => setVoiceToast(null), 5000)
    return () => clearTimeout(t)
  }, [voiceToast])

  function handleParsed(text: string, parsed: ParsedLog) {
    setPending({ text, parsed })
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

  // Hands-free voice flow: parse then immediately save, show brief undo toast
  async function handleVoiceTranscript(transcript: string) {
    if (!transcript.trim() || voiceParsing) return
    setVoiceParsing(true)
    try {
      const res = await fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: transcript }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')
      const result = await saveLog(transcript, data.parsed)
      setVoiceToast({ text: transcript, entryId: (result as { entryId?: string }).entryId ?? null })
      window.dispatchEvent(new CustomEvent('parma:saved'))
    } catch {
      // Fall back to manual confirmation drawer
      try {
        const res = await fetch('/api/parse-log', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: transcript }),
        })
        const data = await res.json()
        if (res.ok) setPending({ text: transcript, parsed: data.parsed })
      } catch {
        // ignore
      }
    } finally {
      setVoiceParsing(false)
    }
  }

  async function handleUndo() {
    if (!voiceToast) return
    setVoiceToast(null)
    if (voiceToast.entryId) {
      await deleteLogEntry(voiceToast.entryId).catch(() => {})
      window.dispatchEvent(new CustomEvent('parma:saved'))
    }
  }

  async function handleConfirm(edited: ParsedLog) {
    if (!pending) return
    try {
      const result = await saveLog(pending.text, edited)
      if ((result as { error?: string }).error) {
        setPending((p) => p ? { ...p, saveError: (result as { error?: string }).error } : null)
      } else {
        setPending(null)
        window.dispatchEvent(new CustomEvent('parma:saved'))
      }
    } catch {
      setPending((p) => p ? { ...p, saveError: 'Save failed — please try again' } : null)
    }
  }

  function handleDiscard() {
    setPending(null)
  }

  return (
    <>
      <LogInput
        onParsed={handleParsed}
        onQuestion={handleQuestion}
        onVoiceTranscript={handleVoiceTranscript}
      />

      {/* Voice auto-submit toast with Undo */}
      {(voiceToast || voiceParsing) && (
        <div
          className="mt-2 flex items-center gap-3 px-3 py-2 rounded-xl text-xs"
          style={{
            background: 'var(--accent-dim)',
            border: '1px solid var(--accent)',
            color: 'var(--accent)',
          }}
        >
          {voiceParsing ? (
            <span className="flex items-center gap-2">
              <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Logging via voice…
            </span>
          ) : voiceToast && (
            <>
              <span className="flex-1 truncate">✓ Logged: {voiceToast.text}</span>
              <button
                onClick={handleUndo}
                className="shrink-0 font-semibold underline underline-offset-2"
              >
                Undo
              </button>
            </>
          )}
        </div>
      )}

      {pending && (
        <ConfirmationDrawer
          rawText={pending.text}
          parsed={pending.parsed}
          saveError={pending.saveError}
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
