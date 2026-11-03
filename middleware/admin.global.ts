// SRS ARC-04 / PRM-04. Guard for /admin/**: non-staff are redirected to /admin/login.
export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin') || to.path === '/admin/login') return
  const auth = useAuthStore()
  if (!auth.loaded) await auth.fetchMe()
  if (!auth.isStaff) return navigateTo('/admin/login')
})
