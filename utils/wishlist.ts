// SRS ACC-07: a guest's wishlist lives in the browser and merges into the account at login.
// Pure helpers, defensive parsing (same rules as the cart: never throw on bad storage).
export const WISHLIST_KEY = 'sll_wishlist'
export const MAX_ITEMS = 200

export function parseWishlist(raw: string | null | undefined): number[] {
  if (!raw) return []
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) return []
    const out: number[] = []
    for (const x of data) {
      const n = Number(x)
      if (Number.isInteger(n) && n > 0 && !out.includes(n) && out.length < MAX_ITEMS) out.push(n)
    }
    return out
  } catch { return [] }
}
export const toggleId = (ids: number[], id: number) => (ids.includes(id) ? ids.filter((x) => x !== id) : [id, ...ids].slice(0, MAX_ITEMS))
export const mergeIds = (a: number[], b: number[]) => [...new Set([...a, ...b])].slice(0, MAX_ITEMS)
