import { sanitizeEvent } from '~/utils/consent'

// SRS INS-05: the dataLayer event contract. Events are always pushed to the local dataLayer;
// nothing leaves the browser until the visitor accepts the cookie notice and GTM loads. Every
// payload goes through sanitizeEvent, so no name, phone, address or email can ever be pushed.
//
// Events: page_view, view_item_list, view_item, search, add_to_cart, remove_from_cart,
// add_to_wishlist, begin_checkout, add_payment_info, purchase, ui_click.
export function useTrack() {
  function push(event: string, data: Record<string, unknown> = {}) {
    if (import.meta.server) return
    const w = window as unknown as { dataLayer?: Record<string, unknown>[] }
    ;(w.dataLayer ||= []).push({ event, ...sanitizeEvent(data) })
  }
  /** GA4 ecommerce item shape from a card/detail product (public fields only). */
  const item = (p: { slug: string; name: string; price: string; category?: { name: string } }, extra: Record<string, unknown> = {}) => ({
    item_id: p.slug, item_name: p.name, price: Number(p.price), item_category: p.category?.name, ...extra
  })
  return { push, item }
}
