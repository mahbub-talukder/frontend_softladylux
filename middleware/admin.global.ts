// SRS ARC-04 / PRM-03 / PRM-04. Guard for /admin/**:
// - not signed in -> /admin/login
// - the page's `permission` / `ownerOnly` meta is not held -> /admin/no-access
// Permissions are re-read from the API on every admin navigation (PRM-03), so an Owner edit
// takes effect on the next page change without signing out.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') return
  if (import.meta.server) return // admin is client-rendered (ARC-03)
  const auth = useAuthStore()
  await auth.fetchMe()
  const rule = to.path === '/admin/no-access' ? {} : (to.meta as NavRule)
  const target = guardTarget(auth.isStaff, rule, { isOwner: auth.isOwner, can: auth.can })
  if (target) return navigateTo(target)
})
