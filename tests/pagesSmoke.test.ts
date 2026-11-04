// Guards against the kind of regression lint/typecheck/build cannot see: a composable used outside
// the Nuxt context in a layout makes EVERY storefront page return a 500. Runs only when the dev
// stack is up (VITE_SMOKE_URL), so CI without a server skips it.
import { describe, expect, it } from 'vitest'

const BASE = (import.meta as unknown as { env: Record<string, string | undefined> }).env.VITE_SMOKE_URL
const routes = ['/', '/shop/bras', '/shop/offers', '/shop/new', '/search?q=bra', '/size-guide', '/cart', '/checkout', '/login', '/track', '/contact', '/pages/about', '/pages/privacy', '/robots.txt', '/sitemap.xml']

describe.skipIf(!BASE)('storefront smoke', () => {
  it.each(routes)('%s renders (not a 500)', async (path) => {
    const res = await fetch(`${BASE}${path}`)
    expect(res.status).toBeLessThan(500)
  })
})
