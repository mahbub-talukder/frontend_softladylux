// SRS v1.11 CAT-12: one shared "Buy" dialog for every product card. Cards call `open(product)`; StoreShell renders the
// dialog once (like the size finder), so a listing of 40 cards does not mount 40 dialogs. useState keeps SSR and client
// in agreement (closed).
import type { CardProduct } from '~/types/api'

export function useBuyDialog() {
  const product = useState<CardProduct | null>('buy-dialog-product', () => null)
  // The card whose product was just added shows "Added to bag ✓" on its Buy button for a moment.
  const added = useState<{ id: number; at: number } | null>('buy-dialog-added', () => null)
  return {
    product, added,
    open: (p: CardProduct) => { product.value = p },
    close: () => { product.value = null },
    markAdded: (id: number) => { added.value = { id, at: Date.now() } }
  }
}
