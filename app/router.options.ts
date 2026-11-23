import type { RouterConfig } from '@nuxt/schema'

// SRS v1.11 STF-UI-04: opening a page (product pages in particular) always starts at the top; back/forward restores
// the saved position. Nuxt's default waits for the out-in page transition, but on phones the old page's height, a
// still-open bottom sheet's scroll lock or the URL bar resizing could leave the new page part-way down (or at the
// bottom). Here the scroll is applied after the new page has finished rendering and its transition has ended, and the
// top is enforced once more on the next frame.
export default <RouterConfig>{
  scrollBehavior(to, from, savedPosition) {
    const nuxtApp = useNuxtApp()
    if (to.path === from.path && to.hash) return { el: to.hash, behavior: 'smooth' }
    if (to.path === from.path) return false // query-only changes (filters, pages) keep the place
    return new Promise((resolve) => {
      const go = () => {
        document.documentElement.style.overflow = '' // a dialog's scroll lock must never survive a navigation
        if (savedPosition) return resolve(savedPosition)
        if (to.hash) return resolve({ el: to.hash, top: 0 })
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior })
        resolve({ top: 0, left: 0 })
        requestAnimationFrame(() => { if (window.scrollY > 0 && !savedPosition) window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior }) })
      }
      let fired = false
      const once = () => { if (!fired) { fired = true; go() } }
      nuxtApp.hooks.hookOnce('page:transition:finish', once)
      nuxtApp.hooks.hookOnce('page:finish', () => setTimeout(once, 350)) // fallback when no transition runs
    })
  }
}
