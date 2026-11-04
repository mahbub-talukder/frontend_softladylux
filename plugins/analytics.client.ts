import { clickInfo, type TrackEl } from '~/utils/consent'

// SRS INS-03/INS-05: consent first, then the event contract.
// - Consent Mode defaults to denied; GTM is injected only after Accept (stores/consent.ts).
// - page_view on every route change.
// - any element with data-track="name" raises ui_click with button_name, button_location, page_path.
export default defineNuxtPlugin(async (nuxtApp) => {
  const { data: site } = await useSiteSettings()
  const consent = useConsentStore()
  consent.init(site.value?.gtm_id ?? '')
  const { push } = useTrack()
  const router = useRouter()

  const view = (path: string) => push('page_view', { page_path: path.split('?')[0], page_title: document.title })
  view(router.currentRoute.value.fullPath)
  nuxtApp.hook('page:finish', () => view(router.currentRoute.value.fullPath))

  document.addEventListener('click', (e) => {
    const info = clickInfo(e.target as unknown as TrackEl, router.currentRoute.value.fullPath)
    if (info) push('ui_click', { ...info })
  }, { capture: true })
})
