import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const err = await res.text()
    console.error('Groq transcription error:', err)
    return NextResponse.json({ error: 'Transcription failed' }, { status: 500 })
  }

  const { text } = await res.json()
  return NextResponse.json({ text: text?.trim() ?? '' })
}
