import { tokensToCss } from '~/utils/theme'

// SRS THM-06 / THM-08 / ARC-12. The server plugin injects the saved theme into SSR pages only, so on its own:
//  - the admin (a client-rendered SPA, ARC-03) never received it, and
//  - after "Save & publish" a client-side move to the storefront kept the old colours until a hard reload.
// This client plugin keeps a live copy of the theme in <head> and refreshes it when it can change:
//  - on first load of an admin page (no server-injected block there),
//  - when leaving the admin for the storefront,
//  - right after the theme page publishes or resets (apply()).
// The live block replaces the server-rendered one, so tokens that were dropped (e.g. after Reset) can't linger.
export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig()
  const live = useState<string>('theme-live-css', () => '')
  useHead(() => ({ style: live.value ? [{ key: 'theme-tokens-live', innerHTML: live.value, tagPriority: 'low' as const }] : [] }))

  function apply(tokens: Record<string, string> | null | undefined) {
    const css = tokensToCss(tokens)
    live.value = css
    // Remove the SSR-injected block once we own the theme, so stale neutrals can't survive a reset.
    document.querySelectorAll('style[data-hid="theme-tokens"]').forEach((el) => el.remove())
  }
  async function refresh() {
    try {
      const res = await $fetch<{ tokens?: Record<string, string> }>(`${config.public.apiBase}/theme/`, { credentials: 'include' })
      apply(res?.tokens)
    } catch {
      /* keep whatever is applied; tokens.css holds the Signature defaults (THM-06) */
    }
  }

  if (location.pathname.startsWith('/admin')) void refresh()
  useRouter().afterEach((to, from) => {
    if (from.path.startsWith('/admin') && !to.path.startsWith('/admin')) void refresh()
  })

  return { provide: { applyTheme: apply, refreshTheme: refresh } }
})
