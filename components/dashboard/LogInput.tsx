'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import type { ParsedLog } from '@/lib/ai/types'
import type { OFFProduct } from '@/lib/openFoodFacts'

const QUESTION_RE = /^(how|when|what|show|tell|did|have i|am i|do i|can you|list|give me|which|is my|was my|are my|how many|how much|what's|what is|when did|when was)/i

function looksLikeQuestion(text: string): boolean {
  const t = text.trim()
  return t.endsWith('?') || QUESTION_RE.test(t)
}

interface LogInputProps {
  onParsed: (text: string, parsed: ParsedLog) => void
  onQuestion?: (text: string) => void
  onVoiceTranscript?: (text: string) => void  // hands-free: auto-submit this transcript
  moduleContext?: string  // soft bias for the parse pipeline — e.g. 'food', 'health'
  placeholder?: string
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

// Silence detector — resolves when SILENCE_DURATION ms of quiet is detected
function useSilenceDetector() {
  const SILENCE_THRESHOLD = 0.012  // RMS amplitude fraction (0–1)
  const SILENCE_DURATION  = 1400   // ms of silence before auto-stop

  const acRef  = useRef<AudioContext | null>(null)
  const rafRef = useRef<number>(0)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const start = useCallback((stream: MediaStream, onSilence: () => void) => {
    const ac = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)()
    acRef.current = ac
    const src = ac.createMediaStreamSource(stream)
    const analyser = ac.createAnalyser()
    analyser.fftSize = 256
    src.connect(analyser)
    const buf = new Uint8Array(analyser.fftSize)

    function tick() {
      analyser.getByteTimeDomainData(buf)
      let sum = 0
      for (let i = 0; i < buf.length; i++) sum += (buf[i] - 128) ** 2
      const rms = Math.sqrt(sum / buf.length) / 128

      if (rms < SILENCE_THRESHOLD) {
        if (!timerRef.current) {
          timerRef.current = setTimeout(() => { onSilence() }, SILENCE_DURATION)
        }
      } else {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      }
      rafRef.current = requestAnimationFrame(tick)
    }
    tick()
  }, [])

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    acRef.current?.close().catch(() => {})
    acRef.current = null
  }, [])

  useEffect(() => () => stop(), [stop])

  return { start, stop }
}

// Try Web Speech API for on-device transcription (fallback when Groq unavailable)
type AnySR = {
  lang: string; interimResults: boolean; maxAlternatives: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onresult: (e: any) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onerror: (e: any) => void
  start(): void
}
function speechRecognitionFallback(): Promise<string> {
  return new Promise((resolve, reject) => {
    const win = window as unknown as { SpeechRecognition?: { new(): AnySR }; webkitSpeechRecognition?: { new(): AnySR } }
    const SR = win.SpeechRecognition || win.webkitSpeechRecognition
    if (!SR) { reject(new Error('No speech recognition available')); return }
    const r = new SR()
    r.lang = 'en-GB'
    r.interimResults = false
    r.maxAlternatives = 1
    r.onresult = (e: { results: { [i: number]: { [j: number]: { transcript: string } } } }) => resolve(e.results[0]?.[0]?.transcript ?? '')
    r.onerror = (e: { error: string }) => reject(new Error(e.error))
    r.start()
  })
}

export function LogInput({ onParsed, onQuestion, onVoiceTranscript, moduleContext, placeholder }: LogInputProps) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const { start: startSilence, stop: stopSilence } = useSilenceDetector()

  function autoResize(el: HTMLTextAreaElement) {
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value)
    autoResize(e.target)
  }

  const processBlob = useCallback(async (blob: Blob, mimeType: string) => {
    const ext = mimeType.includes('mp4') ? 'm4a' : mimeType.includes('ogg') ? 'ogg' : 'webm'
    setTranscribing(true)
    try {
      const form = new FormData()
      form.append('audio', blob, `audio.${ext}`)
      const res = await fetch('/api/transcribe', { method: 'POST', body: form })
      const data = await res.json()

      if (!res.ok) {
        // Try Web Speech API fallback if Groq not configured
        if (res.status === 503) {
          try {
            const fallbackText = await speechRecognitionFallback()
            if (fallbackText) {
              if (onVoiceTranscript) {
                onVoiceTranscript(fallbackText)
              } else {
                const appended = text ? `${text} ${fallbackText}` : fallbackText
                setText(appended)
                setTimeout(() => { if (textareaRef.current) autoResize(textareaRef.current) }, 0)
              }
            }
            return
          } catch {
            // fallback also failed — show original error
          }
        }
        throw new Error(data.error ?? 'Transcription failed')
      }

      if (data.text) {
        if (onVoiceTranscript) {
          onVoiceTranscript(data.text)
        } else {
          const appended = text ? `${text} ${data.text}` : data.text
          setText(appended)
          setTimeout(() => { if (textareaRef.current) autoResize(textareaRef.current) }, 0)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transcription failed')
    } finally {
      setTranscribing(false)
    }
  }, [text, onVoiceTranscript])

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
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        stopSilence()
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' })
        chunksRef.current = []
        await processBlob(blob, recorder.mimeType || 'audio/webm')
      }
      mediaRecorderRef.current = recorder
      recorder.start()
      setRecording(true)
      // Start silence detection — auto-stop after 1.4s quiet
      startSilence(stream, () => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop()
          setRecording(false)
        }
      })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone permission denied')
      } else {
        setError('Could not access microphone')
      }
    }
  }

  function stopRecording() {
    stopSilence()
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop()
    }
    setRecording(false)
  }

  async function handleSubmit() {
    if (!text.trim() || loading || transcribing) return
    if (recording) stopRecording()

    if (onQuestion && looksLikeQuestion(text)) {
      const q = text.trim()
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
      onQuestion(q)
      return
    }

    // Queue when offline
    if (!navigator.onLine) {
      try {
        const { enqueueLog } = await import('@/lib/offlineQueue')
        await enqueueLog({
          text,
          date: new Date().toLocaleDateString('en-CA'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          createdAt: Date.now(),
        })
        window.dispatchEvent(new CustomEvent('parma:queued'))
        setText('')
        if (textareaRef.current) textareaRef.current.style.height = 'auto'
        setError(null)
      } catch {
        setError('Failed to queue for later — your text is still here, try again')
      }
      return
    }

    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/parse-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          date: new Date().toLocaleDateString('en-CA'),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          moduleContext,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Parse failed')
      onParsed(text, data.parsed)
      setText('')
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const micBusy = transcribing || loading

  function handleBarcodeResult(product: OFFProduct, barcode: string) {
    setShowScanner(false)
    const portion = product.serving_size_g ?? 100
    const kcal = Math.round(product.kcal_per_100g * portion / 100)
    const protein = Math.round(product.protein_per_100g * portion / 100 * 10) / 10
    const label = product.brand ? `${product.brand} ${product.name}` : product.name
    const entry = `${label} (barcode ${barcode}) — ${portion}g, ~${kcal} kcal, ${protein}g protein`
    setText((prev) => prev ? `${prev}; ${entry}` : entry)
    setTimeout(() => { if (textareaRef.current) autoResize(textareaRef.current) }, 0)
  }

  return (
    <div className="w-full flex flex-col gap-1.5">
      {(recording || transcribing || error) && (
        <div className="flex items-center gap-2 px-1 min-h-[18px]">
          {recording && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
              <span className="text-xs text-red-400">Recording — auto-stops on silence</span>
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

      <div
        data-tour="log-input"
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
          placeholder={placeholder ?? "Log food, sleep, steps, mood… or ask a question"}
          rows={1}
          className="flex-1 resize-none bg-transparent text-text text-sm placeholder:text-text-subtle focus:outline-none leading-relaxed"
          style={{ maxHeight: '120px', overflowY: 'auto' }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
          }}
        />

        {/* Mic — larger touch target on mobile */}
        <button
          type="button"
          onClick={recording ? stopRecording : startRecording}
          disabled={micBusy}
          className={`shrink-0 rounded-xl transition-colors disabled:opacity-40
            p-3 sm:p-2
            ${recording
              ? 'text-red-400 bg-red-500/10 hover:bg-red-500/20'
              : 'text-text-muted hover:text-accent'}`}
          title={recording ? 'Stop (or wait for silence)' : 'Record voice note'}
        >
          {transcribing ? <SpinnerIcon /> : recording ? <StopIcon /> : <MicIcon />}
        </button>

        {/* Barcode scan */}
        <button
          type="button"
          onClick={() => setShowScanner(true)}
          disabled={micBusy}
          className="shrink-0 rounded-xl p-3 sm:p-2 text-text-muted hover:text-accent transition-colors disabled:opacity-40"
          title="Scan barcode"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75ZM6.75 16.5h.75v.75h-.75v-.75ZM16.5 6.75h.75v.75h-.75v-.75ZM13.5 13.5h.75v.75h-.75v-.75ZM13.5 19.5h.75v.75h-.75v-.75ZM19.5 13.5h.75v.75h-.75v-.75ZM19.5 19.5h.75v.75h-.75v-.75ZM16.5 16.5h.75v.75h-.75v-.75Z" />
          </svg>
        </button>

        {/* Send */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!text.trim() || loading || micBusy}
          className="shrink-0 p-3 sm:p-2 rounded-xl bg-accent text-white disabled:opacity-30 hover:opacity-90 transition-opacity"
          title="Log it (⌘↵)"
        >
          {loading ? <SpinnerIcon /> : <SendIcon />}
        </button>
      </div>

      {/* Barcode scanner modal — lazy loaded */}
      {showScanner && (
        <BarcodeScannerLazy
          onResult={handleBarcodeResult}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}

function BarcodeScannerLazy(props: { onResult: (p: OFFProduct, b: string) => void; onClose: () => void }) {
  const [Comp, setComp] = useState<React.ComponentType<{ onResult: (p: OFFProduct, b: string) => void; onClose: () => void }> | null>(null)

  useEffect(() => {
    import('@/components/BarcodeScanner').then((m) => setComp(() => m.BarcodeScanner))
  }, [])

  if (!Comp) return null
  return <Comp {...props} />
}
