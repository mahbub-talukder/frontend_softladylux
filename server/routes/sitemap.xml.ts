import { buildSitemap, siteOrigin, type SitemapUrl } from '../../utils/seo'

// SRS §9 SEO: sitemap.xml built from the public catalogue and content APIs (active items only).
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig(event)
  const api = cfg.apiBaseInternal as string
  const get = async <T>(p: string): Promise<T | null> => { try { return (await $fetch(`${api}${p}`, { timeout: 5000, headers: { 'X-Forwarded-Proto': 'https' } })) as T } catch { return null } }
  const urls: SitemapUrl[] = [
    { path: '/', changefreq: 'daily', priority: 1 }, { path: '/shop/offers', changefreq: 'daily', priority: 0.7 },
    { path: '/shop/new', changefreq: 'daily', priority: 0.7 }, { path: '/size-guide', priority: 0.5 }, { path: '/contact', priority: 0.4 }
  ]
  for (const c of (await get<{ slug: string }[]>('/categories/')) ?? []) urls.push({ path: `/shop/${c.slug}`, changefreq: 'daily', priority: 0.8 })
  for (const slug of ['about', 'delivery-returns', 'privacy', 'terms']) if (await get(`/pages/${slug}/`)) urls.push({ path: `/pages/${slug}`, priority: 0.3 })
  for (let page = 1; page <= 50; page++) {
    const r = await get<{ results: { slug: string }[]; next: string | null }>(`/products/?page=${page}&page_size=100`)
    for (const p of r?.results ?? []) urls.push({ path: `/product/${p.slug}`, changefreq: 'weekly', priority: 0.6 })
    if (!r?.next) break
  }
  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  return buildSitemap(siteOrigin(cfg.public.siteUrl as string, getRequestHost(event, { xForwardedHost: true }), getRequestProtocol(event, { xForwardedProto: true })), urls)
})
