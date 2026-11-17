import { fontForPath, fontLinks, fontToCss, tokensToCss, type ThemeFont } from '~/utils/theme'

// SRS THM-06 / ARC-12 (theme injected into <head> by the Nuxt server, no flash).
// Writes the saved palette into <head> at render time so first paint is themed (THM-06).
// v1.9 THM-22/23: also the font tokens and the one Google Fonts stylesheet of this area's pairing.
// Falls back to the defaults in tokens.css / tailwind font stacks when the API is unavailable.
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  const path = useRequestURL().pathname
  let css = ''
  let font: ThemeFont | undefined
  try {
    const res = await $fetch<{ tokens?: Record<string, string>; fonts?: { storefront?: ThemeFont; admin?: ThemeFont } }>(`${config.apiBaseInternal}/theme/`, {
      timeout: 1500,
      headers: { 'X-Forwarded-Proto': 'https' } // private-network call: TLS was terminated by nginx
    })
    css = tokensToCss(res?.tokens)
    font = fontForPath(res?.fonts, path)
  } catch {
    css = ''
  }
  const fontCss = fontToCss(font)
  // tagPriority 'low' also sorts this block after the stylesheet links (belt and braces next to :where(:root) in tokens.css).
  useHead({
    style: [
      ...(css ? [{ key: 'theme-tokens', innerHTML: css, tagPriority: 'low' as const }] : []),
      ...(fontCss ? [{ key: 'theme-fonts', innerHTML: fontCss, tagPriority: 'low' as const }] : [])
    ],
    link: fontLinks(font)
  })
})
