import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const maxDuration = 30

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await req.formData()
  const audio = formData.get('audio') as File | null
  if (!audio) {
    return NextResponse.json({ error: 'No audio file' }, { status: 400 })
  }

  const mime = audio.type
  const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : 'webm'

  if (!process.env.GROQ_API_KEY) {
    return NextResponse.json(
      { error: 'Voice transcription not configured — add GROQ_API_KEY to Vercel env vars' },
      { status: 503 }
    )
  }

  const groqForm = new FormData()
  groqForm.append('file', audio, `audio.${ext}`)
  groqForm.append('model', 'whisper-large-v3')
  groqForm.append('response_format', 'json')
  groqForm.append('language', 'en')

  const res = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    body: groqForm,
  })

  if (!res.ok) {
    const body = await res.text()
    console.error('Groq transcription error:', body)
    let userMsg = 'Transcription failed'
    try {
      const parsed = JSON.parse(body)
      if (parsed.error?.message) userMsg = `Transcription failed: ${parsed.error.message}`
    } catch {}
    return NextResponse.json({ error: userMsg }, { status: 500 })
  }

  const { text } = await res.json()
  return NextResponse.json({ text: text?.trim() ?? '' })
}
