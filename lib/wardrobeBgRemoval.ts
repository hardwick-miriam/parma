// Background removal for wardrobe bulk-import photos, via remove.bg — a
// consistent solid neutral background (not transparent) so the catalogue
// looks uniform regardless of what the item was originally photographed
// against. Server-only (needs REMOVE_BG_API_KEY).

// Soft neutral off-white, baked into every cutout so the wardrobe grid looks
// consistent — chosen once, not per-theme (this is a real pixel in a PNG,
// not a CSS var).
const CUTOUT_BG_COLOR = 'F2F1ED'

export interface BgRemovalResult {
  bytes: Uint8Array
  mediaType: 'image/png' | 'image/jpeg'
  bgRemoved: boolean
}

/** Removes the background and flattens onto a consistent neutral colour. Falls back to the original image bytes (bgRemoved: false) on any failure — never throws, never loses the photo. */
export async function removeBackground(
  imageBytes: Uint8Array,
  originalMediaType: 'image/jpeg' | 'image/png'
): Promise<BgRemovalResult> {
  const apiKey = process.env.REMOVE_BG_API_KEY
  if (!apiKey) {
    console.error('[wardrobeBgRemoval] REMOVE_BG_API_KEY not set — falling back to original photo')
    return { bytes: imageBytes, mediaType: originalMediaType, bgRemoved: false }
  }

  try {
    const form = new FormData()
    form.append('image_file', new Blob([new Uint8Array(imageBytes)], { type: originalMediaType }), 'photo')
    form.append('size', 'auto')
    form.append('bg_color', CUTOUT_BG_COLOR)
    form.append('format', 'png')

    const res = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
      body: form,
    })

    if (!res.ok) {
      const errBody = await res.text().catch(() => '')
      console.error(`[wardrobeBgRemoval] remove.bg returned ${res.status}: ${errBody.slice(0, 500)}`)
      return { bytes: imageBytes, mediaType: originalMediaType, bgRemoved: false }
    }

    const arrayBuffer = await res.arrayBuffer()
    return { bytes: new Uint8Array(arrayBuffer), mediaType: 'image/png', bgRemoved: true }
  } catch (err) {
    console.error('[wardrobeBgRemoval] remove.bg request failed:', err)
    return { bytes: imageBytes, mediaType: originalMediaType, bgRemoved: false }
  }
}
