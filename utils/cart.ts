// SRS CRT-01/02/07: the cart lives only in the browser. Pure helpers so the storage rules are
// unit-tested: schema version, defensive parsing, migration of the old format, 30 lines,
// quantity 1-10 per line, lines older than 30 days dropped.
export const CART_KEY = 'sll_cart'
export const SCHEMA = 1
export const MAX_LINES = 30
export const MAX_QTY = 10
export const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export interface CartLine {
  variant: number
  quantity: number
  addedAt: number
  // Display snapshot (the server re-validates price and stock, CRT-02)
  name: string
  label: string
  sku: string
  price: string
  image: string | null
  slug: string
}
export type Area = 'inside_dhaka' | 'outside_dhaka'
export interface CartState { v: number; lines: CartLine[]; area: Area | null; coupon: string }

export const emptyCart = (): CartState => ({ v: SCHEMA, lines: [], area: null, coupon: '' })
export const clampQty = (q: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(Number.isFinite(q) ? q : 1)))

function cleanLine(x: unknown, now: number): CartLine | null {
  if (!x || typeof x !== 'object') return null
  const o = x as Record<string, unknown>
  const variant = Number(o.variant)
  const quantity = Number(o.quantity)
  if (!Number.isInteger(variant) || variant <= 0 || !Number.isFinite(quantity)) return null
  const addedAt = typeof o.addedAt === 'number' && o.addedAt > 0 ? o.addedAt : now
  if (now - addedAt > MAX_AGE_MS) return null // CRT-07: lines older than 30 days are dropped
  const str = (v: unknown) => (typeof v === 'string' ? v : '')
  return {
    variant, quantity: clampQty(quantity), addedAt, name: str(o.name), label: str(o.label), sku: str(o.sku),
    price: /^\d+(\.\d+)?$/.test(str(o.price)) ? str(o.price) : '0', image: typeof o.image === 'string' ? o.image : null,
    slug: str(o.slug)
  }
}

/** Never throws: corrupt, old-format or hostile data yields a usable cart (CRT-07). */
export function parseCart(raw: string | null | undefined, now = Date.now()): CartState {
  if (!raw) return emptyCart()
  let data: unknown
  try { data = JSON.parse(raw) } catch { return emptyCart() }
  // v0 (old format): a bare array of lines
  const lines = Array.isArray(data) ? data : (data && typeof data === 'object' && Array.isArray((data as { lines?: unknown }).lines) && (data as { v?: unknown }).v === SCHEMA ? (data as { lines: unknown[] }).lines : null)
  if (!lines) return emptyCart()
  const seen = new Set<number>()
  const out: CartLine[] = []
  for (const l of lines) {
    const c = cleanLine(l, now)
    if (c && !seen.has(c.variant) && out.length < MAX_LINES) { seen.add(c.variant); out.push(c) }
  }
  const meta = (!Array.isArray(data) ? data : {}) as { area?: unknown; coupon?: unknown }
  return {
    v: SCHEMA, lines: out,
    area: meta.area === 'inside_dhaka' || meta.area === 'outside_dhaka' ? meta.area : null,
    coupon: typeof meta.coupon === 'string' ? meta.coupon.slice(0, 20) : ''
  }
}

export const serializeCart = (s: CartState) => JSON.stringify({ ...s, v: SCHEMA })

export type AddResult = { lines: CartLine[]; status: 'added' | 'merged' | 'full' }
/** Add a line; the same variant merges (quantity capped at 10); the 31st line is refused. */
export function addLine(lines: CartLine[], line: CartLine, qty = 1): AddResult {
  const i = lines.findIndex((l) => l.variant === line.variant)
  if (i >= 0) {
    const next = lines.slice()
    next[i] = { ...next[i], ...line, quantity: clampQty(next[i].quantity + qty), addedAt: next[i].addedAt }
    return { lines: next, status: 'merged' }
  }
  if (lines.length >= MAX_LINES) return { lines, status: 'full' }
  return { lines: [...lines, { ...line, quantity: clampQty(qty) }], status: 'added' }
}

export const setQuantity = (lines: CartLine[], variant: number, qty: number) =>
  lines.map((l) => (l.variant === variant ? { ...l, quantity: clampQty(qty) } : l))
export const removeLine = (lines: CartLine[], variant: number) => lines.filter((l) => l.variant !== variant)
export const countItems = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0)
export const subtotalOf = (lines: CartLine[]) => lines.reduce((n, l) => n + Number(l.price) * l.quantity, 0)
