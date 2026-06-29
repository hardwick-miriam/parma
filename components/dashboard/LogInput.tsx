'use client'

import { useState, useRef } from 'react'
import type { ParsedLog } from '@/lib/ai/types'

interface LogInputProps {
  onParsed: (text: string, parsed: ParsedLog) => void
}

function MicIcon() {
  return (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
      <path d="M7 4a3 3 0 016 0v6a3 3 0 11-6 0V4z" />
      <path d="M5.5 9.643a.75.75 0 00-1.5 0V10a6 6 0 0011.97.752.75.75 0 00-1.492-.177A4.5 4.5 0 015.5 10v-.357z" />
    </svg>
  )
}

function StopIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
      <rect x="4" y="4" width="12" height="12" rx="2" />
    </svg>
  )
}

function SendIcon() {
  return (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function LogInput({ onParsed }: LogInputProps) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    autoResize(e.target)
  }

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
            const appended = text ? `${text} ${data.text}` : data.text
            setText(appended)
            setTimeout(() => {
              if (textareaRef.current) autoResize(textareaRef.current)
            }, 0)
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
        setError('Microphone permission denied')
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
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto'
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const micBusy = transcribing || loading

  return (
    <div className="w-full flex flex-col gap-1.5">
      {/* Status line — only visible when something is happening */}
      {(recording || transcribing || error) && (
        <div className="flex items-center gap-2 px-1 min-h-[18px]">
          {recording && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-xs text-red-400">Recording — tap stop when done</span>
            </>
          )}
          {!recording && transcribing && (
            <span className="text-xs text-text-muted">Transcribing…</span>
          )}
          {error && !recording && !transcribing && (
            <span className="text-xs text-red-400">{error}</span>
          )}
        </div>
      )}

      {/* Pill */}
      <div
        className="flex items-end gap-2 rounded-2xl border px-4 py-3 transition-colors"
        style={{
          background: 'var(--surface-elevated)',
          borderColor: recording ? 'rgba(239,68,68,0.4)' : 'var(--border)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          placeholder="Log food, sleep, steps, mood, workouts…"
          rows={1}
          className="flex-1 resize-none bg-transparent text-text text-sm placeholder:text-text-subtle focus:outline-none leading-relaxed"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
        />

        {/* Mic button */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={micBusy}
          className={`shrink-0 p-2 rounded-xl transition-colors disabled:opacity-40 ${
            recording
              ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-text-muted hover:text-accent'
          }`}
          title={recording ? 'Stop recording' : 'Record voice note'}
        >
          {transcribing ? <SpinnerIcon /> : recording ? <StopIcon /> : <MicIcon />}
        </button>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || loading || micBusy}
          className="shrink-0 p-2 rounded-xl bg-accent text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
          title="Log it (⌘↵)"
        >
          {loading ? <SpinnerIcon /> : <SendIcon />}
        </button>
      </div>
    </div>
  )
}
