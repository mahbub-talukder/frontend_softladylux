import { sanitizeEvent } from '~/utils/consent'
import { ecommerceEntries, firstTime, lineItem, productItem, type GaItem } from '~/utils/ecommerce'

// SRS INS-05: the dataLayer event contract. Events are always pushed to the local dataLayer;
// nothing leaves the browser until the visitor accepts the cookie notice and GTM loads. Every
// payload goes through sanitizeEvent, so no name, phone, address or email can ever be pushed.
//
// Events: page_view, ui_click, search, login, sign_up (plain), and the GA4 ecommerce events
// view_item_list, view_item, add_to_cart, remove_from_cart, add_to_wishlist, begin_checkout,
// add_payment_info, purchase, pushed as {event, ecommerce: {currency: 'BDT', value, items[]}} (v1.6).
export function useTrack() {
  const layer = () => ((window as unknown as { dataLayer?: Record<string, unknown>[] }).dataLayer ||= [])
  function push(event: string, data: Record<string, unknown> = {}) {
    if (import.meta.server) return
    layer().push({ event, ...sanitizeEvent(data) })
  }
  /** GA4 ecommerce event; `value` defaults to the items' total. List views carry no value. */
  function ecommerce(event: string, data: { items: GaItem[]; value?: number; [k: string]: unknown }) {
    if (import.meta.server) return
    layer().push(...ecommerceEntries(event, data, event !== 'view_item_list'))
  }
  /** purchase, once per order in this browser session (a retried checkout returns the same order). */
  function purchase(transactionId: string, data: { items: GaItem[]; value: number; shipping?: number; coupon?: string }) {
    if (import.meta.server) return
    let store: Storage | null = null
    try { store = window.sessionStorage } catch { /* blocked */ }
    if (firstTime('sll_purchased', transactionId, store)) ecommerce('purchase', { transaction_id: transactionId, ...data })
  }
  return { push, ecommerce, purchase, item: productItem, line: lineItem }
}
