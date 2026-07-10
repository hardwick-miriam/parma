import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WardrobeItem, WardrobeItemWithStats, NewWardrobeItem } from '@/lib/wardrobeTypes'

export type { WardrobeType, WardrobeCondition, Season, WardrobeItem, WardrobeItemWithStats, NewWardrobeItem } from '@/lib/wardrobeTypes'
export { currentSeason } from '@/lib/wardrobeTypes'

const BUCKET = 'wardrobe'

async function signPhotos(
  supabase: SupabaseClient,
  items: WardrobeItem[]
): Promise<Array<WardrobeItem & { photo_url: string | null }>> {
  const paths = items.map((i) => i.photo_path).filter((p): p is string => !!p)
  if (!paths.length) return items.map((i) => ({ ...i, photo_url: null }))

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600)
  if (error) {
    console.error('[wardrobe] signed URL batch failed:', error.message)
    return items.map((i) => ({ ...i, photo_url: null }))
  }
  const urlByPath = new Map((data ?? []).map((d) => [d.path, d.signedUrl]))
  return items.map((i) => ({
    ...i,
    photo_url: i.photo_path ? urlByPath.get(i.photo_path) ?? null : null,
  }))
}

export async function getWardrobeItems(
  userId: string,
  client?: SupabaseClient
): Promise<WardrobeItemWithStats[]> {
  const supabase = client ?? (await createClient())

  const { data: items, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  if (!items?.length) return []

  const { data: wears, error: wearsError } = await supabase
    .from('wardrobe_wears')
    .select('item_id, worn_on')
    .eq('user_id', userId)
  if (wearsError) throw wearsError

  const wearsByItem = new Map<string, string[]>()
  for (const w of wears ?? []) {
    const list = wearsByItem.get(w.item_id) ?? []
    list.push(w.worn_on)
    wearsByItem.set(w.item_id, list)
  }

  const signed = await signPhotos(supabase, items as WardrobeItem[])

  return signed.map((item) => {
    const itemWears = (wearsByItem.get(item.id) ?? []).sort().reverse()
    const wearCount = itemWears.length
    const lastWorn = itemWears[0] ?? null
    const costPerWear =
      item.price_paid != null && wearCount > 0 ? Math.round((item.price_paid / wearCount) * 100) / 100 : null
    return { ...item, wear_count: wearCount, last_worn: lastWorn, cost_per_wear: costPerWear }
  })
}

export async function getWardrobeItem(
  userId: string,
  itemId: string,
  client?: SupabaseClient
): Promise<(WardrobeItemWithStats & { wear_dates: string[] }) | null> {
  const supabase = client ?? (await createClient())

  const { data: item, error } = await supabase
    .from('wardrobe_items')
    .select('*')
    .eq('user_id', userId)
    .eq('id', itemId)
    .maybeSingle()
  if (error) throw error
  if (!item) return null

  const { data: wears, error: wearsError } = await supabase
    .from('wardrobe_wears')
    .select('worn_on')
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .order('worn_on', { ascending: false })
  if (wearsError) throw wearsError

  const wearDates = (wears ?? []).map((w) => w.worn_on)
  const [signed] = await signPhotos(supabase, [item as WardrobeItem])
  const costPerWear =
    item.price_paid != null && wearDates.length > 0
      ? Math.round((item.price_paid / wearDates.length) * 100) / 100
      : null

  return {
    ...signed,
    wear_count: wearDates.length,
    last_worn: wearDates[0] ?? null,
    cost_per_wear: costPerWear,
    wear_dates: wearDates,
  }
}

export async function insertWardrobeItem(
  userId: string,
  item: NewWardrobeItem,
  client?: SupabaseClient
): Promise<WardrobeItem> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('wardrobe_items')
    .insert({
      user_id: userId,
      photo_path: item.photo_path ?? null,
      name: item.name,
      type: item.type,
      colours: item.colours ?? [],
      brand: item.brand ?? null,
      size: item.size ?? null,
      seasons: item.seasons ?? [],
      tags: item.tags ?? [],
      condition: item.condition ?? null,
      price_paid: item.price_paid ?? null,
      acquired_on: item.acquired_on ?? null,
      notes: item.notes ?? null,
    })
    .select('*')
    .single()
  if (error) throw error
  return data as WardrobeItem
}

export async function updateWardrobeItem(
  userId: string,
  itemId: string,
  updates: Partial<NewWardrobeItem>,
  client?: SupabaseClient
): Promise<WardrobeItem> {
  const supabase = client ?? (await createClient())
  const { data, error } = await supabase
    .from('wardrobe_items')
    .update(updates)
    .eq('user_id', userId)
    .eq('id', itemId)
    .select('*')
    .single()
  if (error) throw error
  return data as WardrobeItem
}

export async function deleteWardrobeItem(
  userId: string,
  itemId: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())

  const { data: item, error: fetchError } = await supabase
    .from('wardrobe_items')
    .select('photo_path')
    .eq('user_id', userId)
    .eq('id', itemId)
    .maybeSingle()
  if (fetchError) throw fetchError

  const { error: deleteError } = await supabase
    .from('wardrobe_items')
    .delete()
    .eq('user_id', userId)
    .eq('id', itemId)
  if (deleteError) throw deleteError

  if (item?.photo_path) {
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([item.photo_path])
    if (storageError) {
      console.error('[wardrobe] failed to remove storage object:', item.photo_path, storageError.message)
    }
  }
}

export async function logWear(
  userId: string,
  itemId: string,
  wornOn: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase
    .from('wardrobe_wears')
    .upsert(
      { user_id: userId, item_id: itemId, worn_on: wornOn },
      { onConflict: 'item_id,worn_on', ignoreDuplicates: true }
    )
  if (error) throw error
}

export async function removeWear(
  userId: string,
  itemId: string,
  wornOn: string,
  client?: SupabaseClient
): Promise<void> {
  const supabase = client ?? (await createClient())
  const { error } = await supabase
    .from('wardrobe_wears')
    .delete()
    .eq('user_id', userId)
    .eq('item_id', itemId)
    .eq('worn_on', wornOn)
  if (error) throw error
}

export async function uploadWardrobePhoto(
  userId: string,
  bytes: Uint8Array,
  ext: string,
  client?: SupabaseClient
): Promise<string> {
  const supabase = client ?? (await createClient())
  const path = `${userId}/${crypto.randomUUID()}.${ext}`
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: ext === 'png' ? 'image/png' : 'image/jpeg', upsert: false })
  if (error) throw error
  return path
}
