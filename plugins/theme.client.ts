import { fontForPath, fontLinks, fontToCss, tokensToCss, type ThemeFont } from '~/utils/theme'

// SRS THM-06 / THM-08 / ARC-12. The server plugin injects the saved theme into SSR pages only, so on its own:
//  - the admin (a client-rendered SPA, ARC-03) never received it, and
//  - after "Save & publish" a client-side move to the storefront kept the old colours until a hard reload.
// This client plugin keeps a live copy of the theme in <head> and refreshes it when it can change:
//  - on first load of an admin page (no server-injected block there),
//  - when leaving the admin for the storefront,
//  - right after the theme page publishes or resets (apply()).
// The live block replaces the server-rendered one, so tokens that were dropped (e.g. after Reset) can't linger.
// v1.9 THM-21/23: the same live copy carries the font tokens and stylesheet of the current area
// (admin pairing on /admin, storefront pairing elsewhere), refreshed when crossing between them.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const live = useState<string>('theme-live-css', () => '')
  const liveFont = useState<ThemeFont | null>('theme-live-font', () => null)
  useHead(() => {
    const fontCss = fontToCss(liveFont.value)
    return {
      style: [
        ...(live.value ? [{ key: 'theme-tokens-live', innerHTML: live.value, tagPriority: 'low' as const }] : []),
        ...(fontCss ? [{ key: 'theme-fonts-live', innerHTML: fontCss, tagPriority: 'low' as const }] : [])
      ],
      link: fontLinks(liveFont.value) // same keys as the server links, so they replace them
    }
  })
  type Fonts = { storefront?: ThemeFont; admin?: ThemeFont }
  let lastFonts: Fonts | undefined
  function applyFonts(fonts: Fonts | undefined, path = useRouter().currentRoute.value.path) {
    lastFonts = fonts ?? lastFonts
    const f = fontForPath(lastFonts, path)
    if (!f) return
    liveFont.value = f
    document.querySelectorAll('style[data-hid="theme-fonts"]').forEach((el) => el.remove())
  }

  function apply(tokens: Record<string, string> | null | undefined) {
    const css = tokensToCss(tokens)
    live.value = css
    // Remove the SSR-injected block once we own the theme, so stale neutrals can't survive a reset.
    document.querySelectorAll('style[data-hid="theme-tokens"]').forEach((el) => el.remove())
  }
  async function refresh() {
    try {
      const res = await $fetch<{ tokens?: Record<string, string>; fonts?: Fonts }>(`${config.public.apiBase}/theme/`, { credentials: 'include' })
      apply(res?.tokens)
      applyFonts(res?.fonts)
    } catch {
      /* keep whatever is applied; tokens.css holds the Signature defaults (THM-06) */
    }
  }

  if (location.pathname.startsWith('/admin')) void refresh()
  useRouter().afterEach((to, from) => {
    if (from.path.startsWith('/admin') && !to.path.startsWith('/admin')) void refresh()
    else if (!from.path.startsWith('/admin') && to.path.startsWith('/admin')) void refresh() // THM-21: admin pairing
  })

  return { provide: { applyTheme: apply, refreshTheme: refresh } }
})
