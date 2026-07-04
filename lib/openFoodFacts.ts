const OFF_SEARCH = 'https://world.openfoodfacts.org/cgi/search.pl'
const OFF_BARCODE = 'https://world.openfoodfacts.org/api/v2/product'

export interface OFFProduct {
  name: string
  brand: string
  kcal_per_100g: number
  protein_per_100g: number
  carbs_per_100g: number
  fat_per_100g: number
  serving_size_g: number | null
  barcode: string | null
  confidence: 'high' | 'medium' | 'low'
}

function extractNutriments(n: Record<string, unknown>): Omit<OFFProduct, 'name' | 'brand' | 'serving_size_g' | 'barcode' | 'confidence'> | null {
  const kcal = Number(n['energy-kcal_100g'] ?? n['energy_100g'])
  const protein = Number(n['proteins_100g'])
  const carbs = Number(n['carbohydrates_100g'])
  const fat = Number(n['fat_100g'])
  if (!kcal || isNaN(kcal)) return null
  return {
    kcal_per_100g: Math.round(kcal),
    protein_per_100g: Math.round((protein ?? 0) * 10) / 10,
    carbs_per_100g: Math.round((carbs ?? 0) * 10) / 10,
    fat_per_100g: Math.round((fat ?? 0) * 10) / 10,
  }
}

function parseProduct(p: Record<string, unknown>, confidence: OFFProduct['confidence']): OFFProduct | null {
  const n = (p.nutriments ?? {}) as Record<string, unknown>
  const nutr = extractNutriments(n)
  if (!nutr) return null

  const serving = Number(p.serving_quantity) || null

  return {
    name: String(p.product_name ?? p.product_name_en ?? '').trim() || 'Unknown',
    brand: String(p.brands ?? '').split(',')[0].trim(),
    ...nutr,
    serving_size_g: serving,
    barcode: String(p.code ?? p._id ?? ''),
    confidence,
  }
}

/** Search Open Food Facts by product name (e.g. "Tesco chicken wrap") */
export async function searchOFF(query: string): Promise<OFFProduct | null> {
  try {
    const params = new URLSearchParams({
      search_terms: query,
      search_simple: '1',
      action: 'process',
      json: '1',
      page_size: '5',
      fields: 'product_name,product_name_en,brands,nutriments,serving_quantity,code',
    })
    const res = await fetch(`${OFF_SEARCH}?${params}`, {
      headers: { 'User-Agent': 'Parma Health Tracker/1.0 (hardwickars@gmail.com)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as { products?: unknown[] }
    const products = data.products ?? []

    for (const p of products) {
      const parsed = parseProduct(p as Record<string, unknown>, 'medium')
      if (parsed && parsed.kcal_per_100g > 0) {
        // Boost confidence if name matches well
        const nameLower = parsed.name.toLowerCase()
        const queryLower = query.toLowerCase()
        const confidence = queryLower.split(' ').filter(w => w.length > 3).some(w => nameLower.includes(w))
          ? 'high' : 'medium'
        return { ...parsed, confidence }
      }
    }
    return null
  } catch (err) {
    console.error('[OFF search] error:', err)
    return null
  }
}

/** Lookup Open Food Facts by barcode */
export async function lookupBarcode(barcode: string): Promise<OFFProduct | null> {
  try {
    const res = await fetch(`${OFF_BARCODE}/${barcode}.json`, {
      headers: { 'User-Agent': 'Parma Health Tracker/1.0 (hardwickars@gmail.com)' },
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json() as { status: number; product?: unknown }
    if (data.status !== 1 || !data.product) return null
    return parseProduct(data.product as Record<string, unknown>, 'high')
  } catch (err) {
    console.error('[OFF barcode] error:', err)
    return null
  }
}

/**
 * Extract food mentions from a log string for OFF lookup.
 * Returns the first named food that looks like a branded/packaged product.
 */
export function extractFoodQuery(text: string): string | null {
  // Look for branded foods, named products, or packaged food signals
  const brandedPatterns = [
    /(?:tesco|sainsbury|waitrose|aldi|lidl|asda|m&s|marks and spencer|co-op|greggs|mcdonald|burger king|kfc|subway|pret)\s+\S+(?:\s+\S+)*/i,
    /(?:had|ate|eating|bought|grabbed|picked up)\s+(?:a\s+|an\s+|some\s+)?([A-Z][^.,!?]{5,40})/i,
  ]

  for (const pat of brandedPatterns) {
    const m = text.match(pat)
    if (m) return (m[0] || m[1]).trim().slice(0, 60)
  }
  return null
}
