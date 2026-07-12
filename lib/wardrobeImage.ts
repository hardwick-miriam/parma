'use client'

export interface CompressedImage {
  base64: string // no data: prefix, just the raw base64 payload
  blob: Blob
  mediaType: 'image/jpeg'
}

function isHeic(file: File): boolean {
  const type = file.type.toLowerCase()
  if (type === 'image/heic' || type === 'image/heif') return true
  // iPhone photos picked via a desktop browser's file input frequently report
  // an empty/generic MIME type for HEIC — the extension is the only reliable signal then.
  return /\.hei[cf]$/i.test(file.name)
}

/** Browsers (other than Safari) can't decode HEIC/HEIF via createImageBitmap — iPhone's default photo
 * format, so a realistic case for wardrobe photos, not an edge case. Converts to JPEG first via
 * heic2any (dynamically imported so non-HEIC uploads, the common case, don't pay for it). */
async function toDecodableFile(file: File): Promise<File | Blob> {
  if (!isHeic(file)) return file
  const heic2any = (await import('heic2any')).default
  const converted = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 })
  return Array.isArray(converted) ? converted[0] : converted
}

/** Client-side compress: downscale to a max dimension and re-encode as JPEG. */
export async function compressImage(file: File, maxDimension = 1024, quality = 0.82): Promise<CompressedImage> {
  const decodable = await toDecodableFile(file)
  const bitmap = await createImageBitmap(decodable)
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  ctx.drawImage(bitmap, 0, 0, width, height)

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/jpeg', quality)
  })

  const base64 = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })

  return { base64, blob, mediaType: 'image/jpeg' }
}
