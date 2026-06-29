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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)
  const listeningRef = useRef(false)

  function startListening() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition

    if (!SR) {
      setError('Speech recognition is not supported in this browser — try Chrome or Safari')
      return
    }

    const recognition = new SR()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript
      }
      setText(transcript)
    }

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed') {
        setError('Microphone permission was denied — allow access and try again')
        listeningRef.current = false
        setListening(false)
      }
      // Other errors (network, no-speech, audio-capture) are transient;
      // let onend handle the restart.
    }

    // Chrome fires onend after every utterance even in continuous mode.
    // Auto-restart while listeningRef is true so the button stays active.
    recognition.onend = () => {
      if (listeningRef.current) {
        try { recognition.start() } catch { /* already started */ }
      } else {
        setListening(false)
      }
    }

    recognitionRef.current = recognition
    listeningRef.current = true
    setListening(true)
    recognition.start()
  }

  function stopListening() {
    listeningRef.current = false
    setListening(false)
    recognitionRef.current?.stop()
  }

  async function handleSubmit() {
    if (!text.trim()) return
    if (listening) stopListening()
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
          placeholder="Took creatine and vitamin D, slept 7 hours, drank 2 litres, weight 84kg, feeling good…"
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
