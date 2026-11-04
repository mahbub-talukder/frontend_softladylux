import { defineStore } from 'pinia'
import type { CartValidation } from '~/types/api'
import { addLine, CART_KEY, countItems, parseCart, removeLine, serializeCart, setQuantity, subtotalOf, type Area, type CartLine } from '~/utils/cart'

// SRS CRT-01..CRT-09. The cart is browser-only. If localStorage is unavailable or blocked the cart
// keeps working in memory and tells the user it will not be saved (CRT-07). Open tabs stay in sync
// through the `storage` event (see plugins/cart.client.ts).
export const useCartStore = defineStore('cart', {
  state: () => ({
    lines: [] as CartLine[], area: null as Area | null, coupon: '',
    storageOk: true, hydrated: false,
    check: null as CartValidation | null, checking: false, checkFailed: false
  }),
  getters: {
    count: (s) => countItems(s.lines),
    localSubtotal: (s) => subtotalOf(s.lines),
    // Lines the server flagged: they block checkout until fixed (CRT-03)
    blocked: (s) => (s.check?.lines ?? []).some((l) => l.issues.length > 0),
    issuesFor: (s) => (variant: number) => s.check?.lines.find((l) => l.variant === variant)?.issues ?? []
  },
  actions: {
    read(): string | null {
      try { return window.localStorage.getItem(CART_KEY) } catch { this.storageOk = false; return null }
    },
    hydrate() {
      const c = parseCart(this.read())
      this.lines = c.lines; this.area = c.area; this.coupon = c.coupon
      this.hydrated = true
      this.persist() // writes back the cleaned/migrated form; flags unavailable storage
    },
    persist() {
      const s = serializeCart({ v: 1, lines: this.lines, area: this.area, coupon: this.coupon })
      try { window.localStorage.setItem(CART_KEY, s); this.storageOk = true } catch { this.storageOk = false }
    },
    add(line: CartLine, qty = 1) {
      const r = addLine(this.lines, line, qty)
      this.lines = r.lines; this.persist(); this.check = null
      return r.status
    },
    setQty(variant: number, qty: number) { this.lines = setQuantity(this.lines, variant, qty); this.persist(); this.check = null },
    remove(variant: number) { this.lines = removeLine(this.lines, variant); this.persist(); this.check = null },
    setArea(a: Area | null) { this.area = a; this.persist() },
    setCoupon(code: string) { this.coupon = code.trim().toUpperCase(); this.persist(); this.check = null },
    // CRT-09: the cart is cleared only after an order was created successfully.
    clear() { this.lines = []; this.coupon = ''; this.check = null; this.persist() },
    /** CRT-03/08: re-validate with the server on load and before checkout. */
    async validate() {
      if (!this.lines.length) { this.check = null; return null }
      const { api } = useApi()
      this.checking = true; this.checkFailed = false
      try {
        this.check = await api<CartValidation>('/cart/validate/', {
          method: 'POST',
          body: { lines: this.lines.map((l) => ({ variant: l.variant, quantity: l.quantity })), area: this.area, coupon_code: this.coupon || undefined }
        })
        // refresh the display snapshot with what the server says now
        let changed = false
        const next = this.lines.map((l) => {
          const c = this.check!.lines.find((x) => x.variant === l.variant)
          if (!c || !c.price) return l
          const u = { ...l, price: c.price, name: c.product_name || l.name, label: c.variant_label ?? l.label, image: c.image ?? l.image }
          if (u.price !== l.price || u.name !== l.name || u.label !== l.label || u.image !== l.image) changed = true
          return changed ? u : l
        })
        if (changed) { this.lines = next; this.persist() }
      } catch { this.checkFailed = true } finally { this.checking = false }
      return this.check
    },
    /** One-click fix (CRT-09): lower to what is available, or remove the line. */
    fix(variant: number) {
      const c = this.check?.lines.find((l) => l.variant === variant)
      if (!c) return
      if (c.issues.includes('quantity_above_stock') && c.available_quantity > 0) this.setQty(variant, c.available_quantity)
      else this.remove(variant)
    }
  }
})
