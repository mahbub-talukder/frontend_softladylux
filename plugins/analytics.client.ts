import { clickInfo, type TrackEl } from '~/utils/consent'

// SRS INS-03/INS-05: consent first, then the event contract.
// - Consent Mode defaults to denied; GTM is injected only after Accept (stores/consent.ts).
// - page_view once per page: the first load and `page:finish` can both fire for the same path (v1.6), and a
//   query-only change (filters, sort) is not a new page. page_location has no query string, so search terms
//   or anything typed into a URL never reach GA4.
// - any element with data-track="name" raises ui_click with button_name, button_location, page_path.
export default defineNuxtPlugin(async (nuxtApp) => {
  const { data: site } = await useSiteSettings()
  const consent = useConsentStore()
  consent.init(site.value?.gtm_id ?? '')
  const { push } = useTrack()
  const router = useRouter()

  let last = ''
  const view = (full: string) => {
    const path = full.split('?')[0].split('#')[0]
    if (path === last) return
    last = path
    push('page_view', { page_path: path, page_location: `${window.location.origin}${path}`, page_title: document.title })
  }
  view(router.currentRoute.value.fullPath)

  // SRS INS-05 page_title: on page:finish Nuxt only starts writing the new page's <title> (asynchronously),
  // so document.title still holds the previous page's title there. Push the page_view once unhead reports
  // the head rendered (dom:rendered), with a short fallback in case nothing in the head changed.
  const head = injectHead()
  let pending = ''
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    clearTimeout(timer)
    if (!pending) return
    const full = pending
    pending = ''
    view(full)
  }
  nuxtApp.hook('page:finish', () => {
    flush() // a page left before its title rendered is still counted
    pending = router.currentRoute.value.fullPath
    timer = setTimeout(flush, 500)
  })
  head.hooks.hook('dom:rendered', flush)

  document.addEventListener('click', (e) => {
    const info = clickInfo(e.target as unknown as TrackEl, router.currentRoute.value.fullPath)
    if (info) push('ui_click', { ...info })
  }, { capture: true })
})
