// Restore the customer session (HTTP-only cookie) and the wishlist once per page load.
export default defineNuxtPlugin(async () => {
  const c = useCustomerStore()
  if (!c.loaded) await c.fetchMe()
})
