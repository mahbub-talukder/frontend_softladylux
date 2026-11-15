// SRS INS-05 (amendment v1.6): GA4 ecommerce event shapes. Pure helpers (unit-tested); useTrack pushes them.
// GA4/GTM expect {event, ecommerce: {currency, value, items[]}} and recommend clearing the previous ecommerce object
// first ({ecommerce: null}), so values from one event never leak into the next.
import { sanitizeEvent } from './consent'

export const CURRENCY = 'BDT'

export interface GaItem {
  item_id: string; item_name: string; price: number; quantity?: number
  item_variant?: string; item_category?: string; index?: number
}

/** A card / detail product (public fields only). */
export function productItem(p: { slug: string; name: string; price: string | number; category?: { name: string } | null }, extra: Partial<GaItem> = {}): GaItem {
  return { item_id: p.slug, item_name: p.name, price: Number(p.price), item_category: p.category?.name, ...extra }
}

/** A cart line (local snapshot: the server re-checks prices). */
export function lineItem(l: { slug: string; name: string; label?: string; price: string | number; quantity: number }): GaItem {
  return { item_id: l.slug, item_name: l.name, item_variant: l.label || undefined, price: Number(l.price), quantity: l.quantity }
}

/** Sum of price × quantity, rounded to paisa. */
export const itemsValue = (items: GaItem[]) => Math.round(items.reduce((n, i) => n + i.price * (i.quantity ?? 1), 0) * 100) / 100

/** The two dataLayer entries for one ecommerce event. `value` defaults to the items' total when not given. */
export function ecommerceEntries(event: string, data: { items: GaItem[]; value?: number; [k: string]: unknown }, withValue = true) {
  const ecommerce: Record<string, unknown> = { currency: CURRENCY, ...data }
  if (withValue) ecommerce.value = data.value ?? itemsValue(data.items)
  else delete ecommerce.value
  return [{ ecommerce: null }, { event, ecommerce: sanitizeEvent(ecommerce) }] as const
}

/** True the first time an id is seen in this browser session (purchase is pushed once per order). */
export function firstTime(key: string, id: string, store?: Pick<Storage, 'getItem' | 'setItem'> | null): boolean {
  try {
    const seen: string[] = JSON.parse(store?.getItem(key) || '[]')
    if (seen.includes(id)) return false
    store?.setItem(key, JSON.stringify([...seen, id].slice(-20)))
  } catch { /* storage blocked: push anyway */ }
  return true
}
