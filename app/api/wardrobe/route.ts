import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  getWardrobeItems,
  insertWardrobeItem,
  uploadWardrobePhoto,
  type NewWardrobeItem,
  type WardrobeItemWithStats,
} from '@/lib/db/wardrobe'

export const dynamic = 'force-dynamic'

type SortKey = 'newest' | 'most-worn' | 'least-worn' | 'cost-per-wear'

function applySort(items: WardrobeItemWithStats[], sort: SortKey): WardrobeItemWithStats[] {
  const copy = [...items]
  switch (sort) {
    case 'most-worn':
      return copy.sort((a, b) => b.wear_count - a.wear_count)
    case 'least-worn':
      return copy.sort((a, b) => a.wear_count - b.wear_count)
    case 'cost-per-wear':
      return copy.sort((a, b) => {
        if (a.cost_per_wear == null) return 1
        if (b.cost_per_wear == null) return -1
        return a.cost_per_wear - b.cost_per_wear
      })
    default:
      return copy // already newest-first from the query
  }
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const season = searchParams.get('season')
  const type = searchParams.get('type')
  const colour = searchParams.get('colour')?.toLowerCase()
  const brand = searchParams.get('brand')?.toLowerCase()
  const tag = searchParams.get('tag')?.toLowerCase()
  const search = searchParams.get('search')?.toLowerCase()
  const sort = (searchParams.get('sort') as SortKey) || 'newest'
  const neverWorn = searchParams.get('neverWorn') === '1'

  let items = await getWardrobeItems(user.id, supabase)

  if (season) items = items.filter((i) => i.seasons.includes(season as never))
  if (type) items = items.filter((i) => i.type === type)
  if (colour) items = items.filter((i) => i.colours.some((c) => c.toLowerCase().includes(colour)))
  if (brand) items = items.filter((i) => (i.brand ?? '').toLowerCase().includes(brand))
  if (tag) items = items.filter((i) => i.tags.some((t) => t.toLowerCase().includes(tag)))
  if (search) {
    items = items.filter((i) =>
      [i.name, i.brand, ...i.colours, ...i.tags].filter(Boolean).join(' ').toLowerCase().includes(search)
    )
  }
  if (neverWorn) {
    const cutoff = Date.now() - 60 * 24 * 60 * 60 * 1000
    items = items.filter((i) => i.wear_count === 0 && new Date(i.created_at).getTime() < cutoff)
  }

  items = applySort(items, sort)

  return NextResponse.json({ items })
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const raw = formData.get('data')
  if (typeof raw !== 'string') return NextResponse.json({ error: 'Missing data field' }, { status: 400 })

  let fields: NewWardrobeItem
  try {
    fields = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON in data field' }, { status: 400 })
  }
  if (!fields.name || !fields.type) {
    return NextResponse.json({ error: 'name and type are required' }, { status: 400 })
  }

  const photo = formData.get('photo') as File | null
  let photoPath: string | null = null

  if (photo && photo.size > 0) {
    if (photo.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Photo too large (max 10 MB)' }, { status: 400 })
    }
    const ext = photo.type === 'image/png' ? 'png' : 'jpg'
    const bytes = new Uint8Array(await photo.arrayBuffer())
    try {
      photoPath = await uploadWardrobePhoto(user.id, bytes, ext, supabase)
    } catch (err) {
      console.error('[wardrobe] photo upload failed:', err)
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 })
    }
  }

  try {
    const item = await insertWardrobeItem(user.id, { ...fields, photo_path: photoPath }, supabase)
    let photoUrl: string | null = null
    if (photoPath) {
      const { data } = await supabase.storage.from('wardrobe').createSignedUrl(photoPath, 3600)
      photoUrl = data?.signedUrl ?? null
    }
    return NextResponse.json({ item: { ...item, photo_url: photoUrl, wear_count: 0, last_worn: null, cost_per_wear: null } })
  } catch (err) {
    console.error('[wardrobe] insert failed:', err)
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
  }
}
