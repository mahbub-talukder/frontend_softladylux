import { tokensToCss } from '~/utils/theme'

// SRS THM-06 / ARC-12 (theme injected into <head> by the Nuxt server, no flash).
// Writes the saved palette into <head> at render time so first paint is themed (THM-06).
// Falls back to the defaults in tokens.css when the API is unavailable.
export default defineNuxtPlugin(async () => {
  const config = useRuntimeConfig()
  let css = ''
  try {
    const res = await $fetch<{ tokens?: Record<string, string> }>(`${config.apiBaseInternal}/theme/`, {
      timeout: 1500,
      headers: { 'X-Forwarded-Proto': 'https' } // private-network call: TLS was terminated by nginx
    })
    css = tokensToCss(res?.tokens)
  } catch {
    css = ''
  }
  // tagPriority 'low' also sorts this block after the stylesheet links (belt and braces next to :where(:root) in tokens.css).
  if (css) useHead({ style: [{ key: 'theme-tokens', innerHTML: css, tagPriority: 'low' }] })
})
