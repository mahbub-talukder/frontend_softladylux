import { defineStore } from 'pinia'
import type { CardProduct, CustomerMe } from '~/types/api'
import { mergeIds, parseWishlist, toggleId, WISHLIST_KEY } from '~/utils/wishlist'

// SRS ACC-01..ACC-07. Accounts are optional: everything here is additive to guest checkout.
// The wishlist is stored in the database for signed-in customers; a guest's local wishlist
// (localStorage) is merged into the account at login (ACC-07).
export const useCustomerStore = defineStore('customer', {
  state: () => ({ me: null as CustomerMe | null, loaded: false, wishIds: [] as number[], wishReady: false }),
  getters: { isIn: (s) => !!s.me, isWished: (s) => (id: number) => s.wishIds.includes(id) },
  actions: {
    async fetchMe() {
      const { api } = useApi()
      try { this.me = await api<CustomerMe>('/me/') } catch { this.me = null }
      this.loaded = true
      if (this.me) await this.loadWishlist(); else this.loadGuestWishlist()
    },
    setMe(m: CustomerMe) { this.me = m; this.loaded = true },
    async logout() {
      const { api } = useApi()
      await api('/auth/logout/', { method: 'POST' })
      this.me = null; this.loadGuestWishlist()
    },
    // ---- wishlist
    readGuest(): number[] {
      try { return parseWishlist(window.localStorage.getItem(WISHLIST_KEY)) } catch { return [] }
    },
    writeGuest(ids: number[]) { try { window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(ids)) } catch { /* private mode: in-memory only */ } },
    loadGuestWishlist() { this.wishIds = this.readGuest(); this.wishReady = true },
    async loadWishlist() {
      const { api } = useApi()
      const guest = this.readGuest()
      // ACC-07: merge the guest list into the account once, then clear the local copy
      const list = await api<CardProduct[]>('/me/wishlist/', guest.length ? { method: 'POST', body: { products: guest } } : {}).catch(() => [] as CardProduct[])
      this.wishIds = list.map((p) => p.id); this.wishReady = true
      if (guest.length) this.writeGuest([])
    },
    async toggleWish(productId: number, slug = '') {
      const adding = !this.wishIds.includes(productId)
      this.wishIds = toggleId(this.wishIds, productId)
      if (adding) useTrack().push('add_to_wishlist', { item: slug })
      if (!this.me) { this.writeGuest(this.wishIds); return }
      const { api } = useApi()
      try {
        await api('/me/wishlist/', adding ? { method: 'POST', body: { product: productId } } : { method: 'DELETE', body: { product: productId } })
      } catch { this.wishIds = adding ? this.wishIds.filter((x) => x !== productId) : mergeIds(this.wishIds, [productId]) }
    }
  }
})
