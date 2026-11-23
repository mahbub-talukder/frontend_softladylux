// SRS v1.11 STF-UI-03: `v-reveal` Fade-In-Up entrance for product cards and lazily shown content.
// - One shared IntersectionObserver; each element animates once, then is unobserved and its classes removed.
// - Only opacity and transform animate (compositor-only, no layout work); cards entering together are staggered
//   by 60 ms (max 300 ms) so a row ripples in instead of popping.
// - Server-rendered content that is already on screen at first paint is never hidden (no flash, no LCP cost);
//   content further down, or added later (client navigation, "load more", lazy sections), fades up as it appears.
// - Nothing happens without JS or with prefers-reduced-motion: the content is simply visible.
export default defineNuxtPlugin((nuxtApp) => {
  let io: IntersectionObserver | null = null
  const reduce = import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  function done(el: HTMLElement) {
    el.classList.remove('reveal', 'reveal-in')
    el.style.transitionDelay = ''
  }
  function observer() {
    io ??= new IntersectionObserver((entries) => {
      let k = 0
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        io!.unobserve(el)
        el.style.transitionDelay = `${Math.min(k++, 5) * 60}ms`
        el.classList.add('reveal-in')
        el.addEventListener('transitionend', () => done(el), { once: true })
        setTimeout(() => done(el), 1200) // transitionend can be skipped (hidden tab)
      }
    }, { rootMargin: '0px 0px -6% 0px', threshold: 0.06 })
    return io
  }

  nuxtApp.vueApp.directive<HTMLElement>('reveal', {
    getSSRProps: () => ({}),
    mounted(el) {
      if (!import.meta.client || reduce || !('IntersectionObserver' in window)) return
      if (nuxtApp.isHydrating) {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight && r.bottom > 0) return // already painted on screen: keep it still
      }
      el.classList.add('reveal')
      observer().observe(el)
    },
    beforeUnmount(el) { io?.unobserve(el) }
  })
})
