// SRS CAT-12 (Quick Add) and CAT-13 (sold-out variants stay visible but disabled).
// Pure helpers behind ProductCard's quick add. No Vue, no DOM, so the rules are unit-tested.
import type { CartLine } from '~/utils/cart'
import type { CardProduct } from '~/types/api'

export type QuickAddState = 'idle' | 'picking' | 'added'
export type QuickAddEvent = 'toggle' | 'close' | 'chosen' | 'reset'
export type CardVariant = CardProduct['variants'][number]
export interface SizeChip { variant: CardVariant; label: string; disabled: boolean }

// Hover never appears here on purpose: it only reveals the control in CSS and cannot close `picking`.
export function nextState(s: QuickAddState, e: QuickAddEvent): QuickAddState {
  if (e === 'toggle') return s === 'picking' ? 'idle' : 'picking'
  if (e === 'close') return s === 'picking' ? 'idle' : s
  if (e === 'chosen') return 'added'
  return s === 'added' ? 'idle' : s // reset: the "Added" confirmation timed out
}

export const colourNames = (variants: CardVariant[]): string[] => [...new Set(variants.map((v) => v.color_name))]

// The colour the card is showing (its photo's colour) wins, then the first colour with stock.
export function defaultColour(variants: CardVariant[], shown?: string | null): string {
  const names = colourNames(variants)
  const hit = shown ? names.find((n) => n.toLowerCase() === shown.toLowerCase()) : undefined
  return hit ?? names.find((n) => variants.some((v) => v.color_name === n && v.in_stock)) ?? names[0] ?? ''
}

// One chip per size for a colour; each chip is a real variant, so we add by variant id (never by label).
export function chipsFor(variants: CardVariant[], colour: string): SizeChip[] {
  return variants.filter((v) => v.color_name === colour)
    .map((v) => ({ variant: v, label: v.size_label || 'One size', disabled: !v.in_stock }))
}

export type QuickAddPlan = { mode: 'none' } | { mode: 'direct'; variant: CardVariant } | { mode: 'choose' }
// A card with one variant adds immediately; anything with a choice opens the chips; no stock = nothing to do.
export function planFor(variants: CardVariant[]): QuickAddPlan {
  if (!variants.some((v) => v.in_stock)) return { mode: 'none' }
  if (variants.length === 1) return { mode: 'direct', variant: variants[0] }
  return { mode: 'choose' }
}

export function lineFor(p: Pick<CardProduct, 'name' | 'slug' | 'price' | 'image'>, v: CardVariant, now = Date.now()): CartLine {
  return {
    variant: v.id, quantity: 1, addedAt: now, name: p.name, label: [v.color_name, v.size_label].filter(Boolean).join(' / '),
    sku: v.sku ?? '', price: v.price ?? p.price, image: p.image?.url ?? null, slug: p.slug
  }
}
