/** Live theme controls (client only; no-ops during SSR). `apply(tokens)` swaps the theme in <head> at once,
 * `refresh()` re-reads GET /theme/. Used by Admin → Theme after Save & publish / Reset (SRS THM-08). */
export function useTheme() {
  const nuxt = useNuxtApp()
  return {
    apply: (tokens: Record<string, string> | null | undefined) => { if (import.meta.client) (nuxt.$applyTheme as (t: typeof tokens) => void)?.(tokens) },
    refresh: async () => { if (import.meta.client) await (nuxt.$refreshTheme as () => Promise<void>)?.() }
  }
}
