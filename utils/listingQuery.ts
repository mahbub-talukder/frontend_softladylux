// SRS CAT-09 / CAT-20: listing filters <-> URL query string, so results are shareable and survive
// reload (/shop/bras?sub=air-bra,tube-bra). Pure functions, unit-tested.
export interface Filters {
  sub: string[]
  category: string[] // only used on Offers / New arrivals / Search (CAT-20)
  size: string[]
  colour: string[]
  collection: string[]
  priceMax: number | null
  available: boolean
  sort: 'featured' | 'newest' | 'price_asc' | 'price_desc'
  q: string
}
type Raw = Record<string, string | string[] | null | undefined>

const SORTS = ['featured', 'newest', 'price_asc', 'price_desc'] as const
const csv = (v: Raw[string]): string[] => {
  const s = Array.isArray(v) ? v[0] : v
  return s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []
}
const one = (v: Raw[string]) => (Array.isArray(v) ? v[0] : v) ?? ''

export function emptyFilters(): Filters {
  return { sub: [], category: [], size: [], colour: [], collection: [], priceMax: null, available: false, sort: 'featured', q: '' }
}

export function parseQuery(q: Raw): Filters {
  const price = Number(one(q.price_max))
  const sort = one(q.sort) as Filters['sort']
  return {
    sub: csv(q.sub), category: csv(q.category), size: csv(q.size), colour: csv(q.colour),
    collection: csv(q.collection), priceMax: price > 0 ? price : null,
    available: one(q.available) === '1', sort: SORTS.includes(sort) ? sort : 'featured', q: one(q.q)
  }
}

/** Query for the browser URL: only non-default values, comma-joined lists. */
export function toQuery(f: Filters): Record<string, string> {
  const out: Record<string, string> = {}
  for (const k of ['sub', 'category', 'size', 'colour', 'collection'] as const) if (f[k].length) out[k] = f[k].join(',')
  if (f.priceMax) out.price_max = String(f.priceMax)
  if (f.available) out.available = '1'
  if (f.sort !== 'featured') out.sort = f.sort
  if (f.q) out.q = f.q
  return out
}

/** Params for GET /products/: the page scope (a category page, offers, new) plus the filters. */
export function toApiParams(f: Filters, scope: { category?: string; offers?: boolean; new?: boolean }, page = 1, pageSize = 12) {
  const p: Record<string, string> = { ...toQuery(f), page: String(page), page_size: String(pageSize) }
  if (scope.category) p.category = scope.category // a category page ignores any category in the URL
  if (scope.offers) p.offers = '1'
  if (scope.new) p.new = '1'
  return p
}

export const toggleIn = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v])

/** Removable chips under the toolbar (CAT-20). */
export function chips(f: Filters): { group: keyof Filters; value: string; label: string }[] {
  const out: { group: keyof Filters; value: string; label: string }[] = []
  for (const k of ['sub', 'category', 'size', 'colour', 'collection'] as const) for (const v of f[k]) out.push({ group: k, value: v, label: v })
  if (f.priceMax) out.push({ group: 'priceMax', value: String(f.priceMax), label: `Up to ৳ ${f.priceMax}` })
  if (f.available) out.push({ group: 'available', value: '1', label: 'In stock' })
  return out
}
