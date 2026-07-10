import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { createClient } from '@/lib/supabase/server'
import { getLocalDate } from '@/lib/date'
import { getProgressPhotos, addProgressPhoto, deleteProgressPhotoById } from '@/lib/db/photos'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const photos = await getProgressPhotos(user.id).catch(() => [])

  const withUrls = await Promise.all(
    photos.map(async (p) => {
      const { data } = await supabase.storage
        .from('progress-photos')
        .createSignedUrl(p.storage_path, 3600)
      return { ...p, url: data?.signedUrl ?? null }
    })
  )

  return NextResponse.json({ photos: withUrls })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('photo') as File | null
  const date = formData.get('date') as string | null

  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })

  const photoDate = date ?? getLocalDate()
  const ext = file.name.split('.').pop()?.toLowerCase().replace(/[^a-z]/g, '') || 'jpg'
  const storagePath = `${user.id}/${randomUUID()}.${ext}`

  const bytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('progress-photos')
    .upload(storagePath, new Uint8Array(bytes), {
      contentType: file.type || 'image/jpeg',
    })

  if (uploadError) return NextResponse.json({ error: uploadError.message }, { status: 500 })

  const photo = await addProgressPhoto(user.id, photoDate, storagePath)

  const { data: urlData } = await supabase.storage
    .from('progress-photos')
    .createSignedUrl(storagePath, 3600)

  return NextResponse.json({ photo: { ...photo, url: urlData?.signedUrl ?? null } })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 })

  const deletedPath = await deleteProgressPhotoById(user.id, id)
  if (!deletedPath) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })
  return NextResponse.json({ ok: true })
}
