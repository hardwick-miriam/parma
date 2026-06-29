'use client'

import { useState, useRef } from 'react'
import type { ParsedLog } from '@/lib/ai/types'

interface LogInputProps {
  onParsed: (text: string, parsed: ParsedLog) => void
}

export function LogInput({ onParsed }: LogInputProps) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function startRecording() {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : ''

      const recorder = mimeType
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream)

      chunksRef.current = []

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []

        setTranscribing(true)
        try {
          const form = new FormData()
          form.append('audio', blob, 'audio.webm')

          const res = await fetch('/api/transcribe', { method: 'POST', body: form })
          const data = await res.json()
          if (!res.ok) throw new Error(data.error ?? 'Transcription failed')
          if (data.text) {
            setText((prev) => (prev ? `${prev} ${data.text}` : data.text))
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Transcription failed')
        } finally {
          setTranscribing(false)
        }
      }

      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied — allow access and try again')
      } else {
        setError('Could not access microphone')
      }
    }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop()
    setRecording(false)
  }

  async function handleSubmit() {
    if (!text.trim() || loading || transcribing) return
    if (recording) stopRecording()
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

  const micBusy = recording || transcribing

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
          onClick={recording ? stopRecording : startRecording}
          disabled={transcribing}
          className={`self-end p-3 rounded-xl border transition-colors disabled:opacity-40 ${
            recording
              ? 'bg-red-500 text-white border-red-500'
              : 'bg-surface-elevated border-border text-text-muted hover:border-border-strong'
          }`}
          title={recording ? 'Stop recording' : 'Start voice recording'}
        >
          {transcribing ? (
            <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : recording ? (
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

      {recording && (
        <p className="text-red-400 text-xs flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          Recording — click to stop
        </p>
      )}
      {transcribing && (
        <p className="text-text-muted text-xs">Transcribing…</p>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!text.trim() || loading || micBusy}
        className="self-end px-5 py-2 rounded-xl bg-accent text-bg text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity"
      >
        {loading ? 'Parsing…' : 'Log it ⌘↵'}
      </button>
    </div>
  )
}
