// SRS CAT-03 / ADM-03: live SKU preview in the variant table. Mirrors backend `make_sku`
// (backend/apps/catalog/services.py): PREFIX-COLOUR4-SIZE4, upper-case, letters/digits/dash only.
// The server stays authoritative: it appends -2, -3... on a clash with ANY product, so this is a preview.

const clean = (s: string) => (s || '').toUpperCase().replace(/[^A-Z0-9]/g, '')

export const SKU_MAX = 40

/** Prefix: the product's SKU prefix, else the first 8 letters/digits of the name, else "SKU". */
export function skuPrefix(prefix: string, name: string): string {
  return (prefix || '').trim().toUpperCase() || clean(name).slice(0, 8) || 'SKU'
}

/** Base SKU for one variant (no collision suffix). Empty colour/size parts are left out. */
export function makeSku(prefix: string, name: string, colour: string, size: string): string {
  const parts = [skuPrefix(prefix, name), clean(colour).slice(0, 4), clean(size).slice(0, 4)].filter(Boolean)
  return parts.join('-').slice(0, SKU_MAX)
}

/** Make `base` unique among `taken` (upper-case compare) the way the server does: base, base-2, base-3... */
export function uniqueSku(base: string, taken: Iterable<string>): string {
  const used = new Set([...taken].map((s) => s.toUpperCase()))
  let sku = base
  let n = 2
  while (used.has(sku.toUpperCase())) {
    const suffix = `-${n++}`
    sku = base.slice(0, SKU_MAX - suffix.length) + suffix
  }
  return sku
}
