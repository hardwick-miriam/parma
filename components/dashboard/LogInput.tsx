'use client'

import { useState, useRef } from 'react'
import type { ParsedLog } from '@/lib/ai/types'

interface LogInputProps {
  onParsed: (text: string, parsed: ParsedLog) => void
}

export function LogInput({ onParsed }: LogInputProps) {
  const [text, setText] = useState('')
  const [listening, setListening] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const recognitionRef = useRef<{ stop: () => void } | null>(null)

  function startListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SpeechRecognition = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: { results: { [n: number]: { [n: number]: { transcript: string } } } }) => {
      const transcript = Array.from(Object.values(event.results) as { [n: number]: { transcript: string } }[])
        .map((r) => r[0].transcript)
        .join('')
      setText(transcript)
    }

    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  function stopListening() {
    recognitionRef.current?.stop()
    setListening(false)
  }

  async function handleSubmit() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')

      onParsed(text, data.parsed)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Had oatmeal for breakfast (300 cal, 10g protein), went for a 5km run…"
          rows={3}
          className="flex-1 resize-none rounded-xl bg-surface-elevated border border-border text-text placeholder:text-text-subtle text-sm p-3 focus:outline-none focus:border-border-strong"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
        />
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          className={`self-end p-3 rounded-xl border transition-colors ${
            listening
              ? 'bg-accent text-bg border-accent'
              : 'bg-surface-elevated border-border text-text-muted hover:border-border-strong'
          }`}
          title={listening ? 'Stop recording' : 'Start voice input'}
        >
          {listening ? (
            <svg className="w-5 h-5 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <rect x="5" y="5" width="10" height="10" rx="2" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
              <path d="M5.5 9.643a.75.75 0 00-1.5 0V10a6 6 0 0011.97.752.75.75 0 00-1.492-.177A4.5 4.5 0 015.5 10v-.357z" />
            </svg>
          )}
        </button>
      </div>

      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || loading}
        className="self-end px-5 py-2 rounded-xl bg-accent text-bg text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Parsing…' : 'Log it ⌘↵'}
      </button>
    </div>
  )
}
