// SRS v1.7 CAT-24..CAT-26: product/variant weight in whole grams (1–30,000).

export const WEIGHT_MIN = 1
export const WEIGHT_MAX = 30000
export const DEFAULT_WEIGHT_GRAMS = 100 // CAT-24: default for new products

/** CAT-25: a blank variant weight means "same as the product" and is sent as null. */
export function variantWeightPayload(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** CAT-26: grams as shown on order detail and the delivery slip, e.g. 450 → "450 g", 1250 → "1.25 kg". */
export function formatWeight(grams: number | null | undefined): string {
  if (grams === null || grams === undefined || !Number.isFinite(grams)) return '—'
  if (grams < 1000) return `${grams} g`
  return `${Number((grams / 1000).toFixed(2))} kg`
}
