// /account/** needs a signed-in customer (STF routes). Everything else stays open: accounts are optional.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/account') || import.meta.server) return
  const c = useCustomerStore()
  if (!c.loaded) await c.fetchMe()
  if (!c.me) return navigateTo({ path: '/login', query: { next: to.fullPath } })
})
