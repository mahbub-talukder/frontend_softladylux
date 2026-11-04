// SRS §9 SEO: sitemap.xml, robots.txt (admin disallowed), Product + Breadcrumb structured data,
// canonical URLs. Pure builders so the output is unit-tested.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export interface SitemapUrl { path: string; changefreq?: string; priority?: number }

export function buildSitemap(base: string, urls: SitemapUrl[]): string {
  const root = base.replace(/\/+$/, '')
  const seen = new Set<string>()
  const rows = urls.filter((u) => u.path.startsWith('/') && !seen.has(u.path) && seen.add(u.path)).map((u) =>
    `  <url><loc>${esc(root + u.path)}</loc>${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}${u.priority !== undefined ? `<priority>${u.priority.toFixed(1)}</priority>` : ''}</url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>\n`
}

/** Pages that must stay out of search results: admin, cart, checkout, account, order pages. */
export const DISALLOWED = ['/admin', '/cart', '/checkout', '/account', '/order', '/login', '/track', '/search']

export function buildRobots(base: string): string {
  const root = base.replace(/\/+$/, '')
  return `User-agent: *\n${DISALLOWED.map((p) => `Disallow: ${p}`).join('\n')}\nAllow: /\n\nSitemap: ${root}/sitemap.xml\n`
}

/** Public origin: explicit setting wins, else the request host (hosting is undecided, so no guess). */
export function siteOrigin(configured: string | undefined, host: string | undefined, proto: string | undefined): string {
  if (configured) return configured.replace(/\/+$/, '')
  return `${proto === 'https' ? 'https' : 'http'}://${host || 'localhost'}`
}

export const canonicalOf = (origin: string, path: string) => origin.replace(/\/+$/, '') + (path.split('?')[0].split('#')[0] || '/')

interface LdProduct { name: string; slug: string; price: string; short_desc?: string; description?: string; image?: { url: string } | null; sold_out: boolean; variants: { sku: string }[]; breadcrumb: { name: string; slug: string }[] }

export function productJsonLd(origin: string, p: LdProduct, imageBase = origin) {
  const url = `${origin}/product/${p.slug}`
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, url, sku: p.variants[0]?.sku,
    description: (p.short_desc || p.description || '').slice(0, 300) || undefined,
    image: p.image ? `${imageBase}${p.image.url}` : undefined,
    offers: { '@type': 'Offer', url, priceCurrency: 'BDT', price: Number(p.price).toFixed(2), availability: p.sold_out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock' }
  }
}

export function breadcrumbJsonLd(origin: string, p: Pick<LdProduct, 'name' | 'slug' | 'breadcrumb'>) {
  const items = [{ name: 'Home', url: `${origin}/` }]
  p.breadcrumb.forEach((b, i) => items.push({ name: b.name, url: i === 0 ? `${origin}/shop/${b.slug}` : `${origin}/shop/${p.breadcrumb[0].slug}?sub=${b.slug}` }))
  items.push({ name: p.name, url: `${origin}/product/${p.slug}` })
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.url })) }
}

/** JSON for a <script type="application/ld+json"> tag: `<` is escaped so content can't close the tag. */
export const ldScript = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')
