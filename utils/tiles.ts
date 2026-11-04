// Design: placeholder tiles. A tinted tile with garment line art stands in for a missing photo
// (decision: show the canvas's tile + art). Pure helpers so the mapping is tested.
export const TILES = ['tile-1', 'tile-2', 'tile-3', 'tile-4', 'tile-5', 'tile-6', 'tile-7', 'tile-8'] as const

const KIND_BY_CATEGORY: Record<string, string> = {
  bras: 'bra', panties: 'brief', 'lingerie-sets': 'set', shapewear: 'shape', sleepwear: 'gown', tops: 'top', accessories: 'acc', 'gift-sets': 'gift'
}
const KINDS = ['bra', 'brief', 'set', 'shape', 'gown', 'top', 'gift', 'acc']

/** Line-art kind for a category slug; unknown categories get a stable kind from the slug. */
export function artKind(slug: string | undefined | null): string {
  if (!slug) return 'top'
  if (KIND_BY_CATEGORY[slug]) return KIND_BY_CATEGORY[slug]
  let h = 0
  for (const c of slug) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return KINDS[h % KINDS.length]
}

/** Tailwind background class for a tile; stable for the same key so cards don't flicker. */
export function tileClass(key: number | string | undefined | null): string {
  const n = typeof key === 'number' ? key : [...String(key ?? '')].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7)
  return `bg-${TILES[Math.abs(n) % TILES.length]}`
}
