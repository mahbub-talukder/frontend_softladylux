import { CART_KEY } from '~/utils/cart'

// SRS CRT-07: hydrate the cart once in the browser, then stay in sync when another tab changes it.
export default defineNuxtPlugin(() => {
  const cart = useCartStore()
  cart.hydrate()
  window.addEventListener('storage', (e) => {
    if (e.key === CART_KEY || e.key === null) cart.hydrate()
  })
})
