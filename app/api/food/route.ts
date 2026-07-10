import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { searchOFF, lookupBarcode, type OFFProduct } from '@/lib/openFoodFacts'

export const maxDuration = 15

function cacheKey(type: 'barcode' | 'search', value: string): string {
  return type === 'barcode' ? `barcode:${value}` : `search:${value.toLowerCase().trim()}`
}

async function fromCache(supabase: Awaited<ReturnType<typeof createClient>>, key: string): Promise<OFFProduct | null> {
  const { data } = await supabase
    .from('food_cache')
    .select('*')
    .eq('cache_key', key)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (!data) return null
  return {
    name: data.product_name,
    brand: data.brand ?? '',
    kcal_per_100g: Number(data.kcal_per_100g),
    protein_per_100g: Number(data.protein_per_100g),
    carbs_per_100g: Number(data.carbs_per_100g),
    fat_per_100g: Number(data.fat_per_100g),
    fibre_per_100g: Number(data.fibre_per_100g ?? 0),
    sugar_per_100g: Number(data.sugar_per_100g ?? 0),
    salt_per_100g: Number(data.salt_per_100g ?? 0),
    serving_size_g: data.serving_size_g ? Number(data.serving_size_g) : null,
    barcode: data.barcode,
    confidence: data.confidence as OFFProduct['confidence'],
  }
}

async function toCache(supabase: Awaited<ReturnType<typeof createClient>>, key: string, product: OFFProduct) {
  const { error } = await supabase.from('food_cache').upsert({
    cache_key: key,
    product_name: product.name,
    brand: product.brand,
    kcal_per_100g: product.kcal_per_100g,
    protein_per_100g: product.protein_per_100g,
    carbs_per_100g: product.carbs_per_100g,
    fat_per_100g: product.fat_per_100g,
    fibre_per_100g: product.fibre_per_100g,
    sugar_per_100g: product.sugar_per_100g,
    salt_per_100g: product.salt_per_100g,
    serving_size_g: product.serving_size_g,
    barcode: product.barcode,
    confidence: product.confidence,
    fetched_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  }, { onConflict: 'cache_key' })

  if (error) console.error('[food/cache] upsert error:', error.message)
}

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const barcode = searchParams.get('barcode')
  const query = searchParams.get('q')

  if (!barcode && !query) {
    return NextResponse.json({ error: 'Provide ?barcode= or ?q=' }, { status: 400 })
  }

  if (barcode) {
    const key = cacheKey('barcode', barcode)
    const cached = await fromCache(supabase, key)
    if (cached) return NextResponse.json({ product: cached, source: 'cache' })

    const product = await lookupBarcode(barcode)
    if (!product) return NextResponse.json({ product: null })

    await toCache(supabase, key, product)
    return NextResponse.json({ product, source: 'off' })
  }

  const key = cacheKey('search', query!)
  const cached = await fromCache(supabase, key)
  if (cached) return NextResponse.json({ product: cached, source: 'cache' })

  const product = await searchOFF(query!)
  if (!product) return NextResponse.json({ product: null })

  await toCache(supabase, key, product)
  return NextResponse.json({ product, source: 'off' })
}
