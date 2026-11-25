// SRS §9 SEO: sitemap.xml, robots.txt (admin disallowed), Product + Breadcrumb structured data,
// canonical URLs. Pure builders so the output is unit-tested.
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

export interface SitemapUrl { path: string; changefreq?: string; priority?: number; images?: string[] }

export function buildSitemap(base: string, urls: SitemapUrl[]): string {
  const root = base.replace(/\/+$/, '')
  const seen = new Set<string>()
  const rows = urls.filter((u) => u.path.startsWith('/') && !seen.has(u.path) && seen.add(u.path)).map((u) =>
    `  <url><loc>${esc(root + u.path)}</loc>${u.changefreq ? `<changefreq>${u.changefreq}</changefreq>` : ''}${u.priority !== undefined ? `<priority>${u.priority.toFixed(1)}</priority>` : ''}${
      (u.images ?? []).map((src) => `<image:image><image:loc>${esc(/^https?:/.test(src) ? src : root + src)}</image:loc></image:image>`).join('')}</url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">\n${rows.join('\n')}\n</urlset>\n`
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

// ---- Titles and descriptions (SEO copy v1, docs/seo-copy.md). Titles aim for <= 60 characters.
export const BRAND = 'SoftLadyLux'
const TITLE_MAX = 60

/** `Page | SoftLadyLux`; a title that already names the brand (the home title) is left alone. */
export function withBrand(title: string | null | undefined, brand = BRAND): string {
  const t = (title || '').trim()
  if (!t) return brand
  return t.toLowerCase().includes(brand.toLowerCase()) ? t : `${t} | ${brand}`
}

/** Category: the admin SEO title wins, else `Bras Online in Bangladesh`. */
export const categoryTitle = (c: { name: string; seo_title?: string }) => c.seo_title || `${c.name} Online in Bangladesh`

/** Product: the admin SEO title wins, else `Jelly Bra Price in Bangladesh`, falling back to the bare name when too long. */
export function productTitle(p: { name: string; seo_title?: string }, brand = BRAND): string {
  if (p.seo_title) return p.seo_title
  const long = `${p.name} Price in Bangladesh`
  return withBrand(long, brand).length <= TITLE_MAX ? long : p.name
}

/** Product meta description: the admin one wins, else the short description plus price and cash on delivery. */
export function productDescription(p: { seo_description?: string; short_desc?: string; description?: string; price: string }): string {
  if (p.seo_description) return p.seo_description
  const base = (p.short_desc || p.description || '').replace(/\s+/g, ' ').trim().replace(/[.!]*$/, '')
  const tail = `Price ৳${Math.round(Number(p.price)).toLocaleString('en-US')}. Cash on delivery all over Bangladesh.`
  return base ? `${base.slice(0, 155 - tail.length - 2)}. ${tail}` : tail
}

// ---- Structured data
interface LdImage { url: string }
interface LdProduct {
  name: string; slug: string; price: string; short_desc?: string; description?: string; image?: LdImage | null; images?: LdImage[]
  sold_out: boolean; variants: { sku: string; price?: string; in_stock?: boolean; color_name?: string; size_label?: string }[]
  breadcrumb: { name: string; slug: string }[]
}
/** Return window from the Delivery & Returns page (section 3: requests within 3 days of delivery). */
export const RETURN_DAYS = 3

/** Delivery fees and the return window used in Offer.shippingDetails / hasMerchantReturnPolicy (Google merchant listings). */
export interface LdShop { brand?: string; feeInsideDhaka?: string; feeOutsideDhaka?: string; returnDays?: number }

const shipping = (fee: string, name: string, days: [number, number]) => ({
  '@type': 'OfferShippingDetails', name,
  shippingRate: { '@type': 'MonetaryAmount', value: Number(fee).toFixed(2), currency: 'BDT' },
  shippingDestination: { '@type': 'DefinedRegion', addressCountry: 'BD' },
  deliveryTime: {
    '@type': 'ShippingDeliveryTime',
    handlingTime: { '@type': 'QuantitativeValue', minValue: 0, maxValue: 1, unitCode: 'DAY' },
    transitTime: { '@type': 'QuantitativeValue', minValue: days[0], maxValue: days[1], unitCode: 'DAY' }
  }
})

export function productJsonLd(origin: string, p: LdProduct, imageBase = origin, shop: LdShop = {}) {
  const url = `${origin}/product/${p.slug}`
  const pics = (p.images?.length ? p.images : p.image ? [p.image] : []).map((i) => `${imageBase}${i.url}`)
  const prices = p.variants.map((v) => Number(v.price ?? p.price)).filter((x) => x > 0)
  const low = prices.length ? Math.min(...prices) : Number(p.price)
  const high = prices.length ? Math.max(...prices) : Number(p.price)
  const availability = p.sold_out ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock'
  const extras: Record<string, unknown> = { itemCondition: 'https://schema.org/NewCondition' }
  const ship = [
    ...(shop.feeInsideDhaka ? [shipping(shop.feeInsideDhaka, 'Inside Dhaka', [1, 2])] : []),
    ...(shop.feeOutsideDhaka ? [shipping(shop.feeOutsideDhaka, 'Outside Dhaka', [2, 5])] : [])
  ]
  if (ship.length) extras.shippingDetails = ship.length === 1 ? ship[0] : ship
  if (shop.returnDays) {
    extras.hasMerchantReturnPolicy = {
      '@type': 'MerchantReturnPolicy', applicableCountry: 'BD',
      returnPolicyCategory: 'https://schema.org/MerchantReturnFiniteReturnWindow', merchantReturnDays: shop.returnDays,
      returnMethod: 'https://schema.org/ReturnByMail', returnFees: 'https://schema.org/ReturnShippingFees'
    }
  }
  const offers = low === high
    ? { '@type': 'Offer', url, priceCurrency: 'BDT', price: low.toFixed(2), availability, ...extras }
    : { '@type': 'AggregateOffer', url, priceCurrency: 'BDT', lowPrice: low.toFixed(2), highPrice: high.toFixed(2), offerCount: prices.length, availability, ...extras }
  return {
    '@context': 'https://schema.org', '@type': 'Product', name: p.name, url, sku: p.variants[0]?.sku,
    brand: { '@type': 'Brand', name: shop.brand || BRAND },
    description: (p.short_desc || p.description || '').slice(0, 300) || undefined,
    image: pics.length > 1 ? pics : pics[0],
    offers
  }
}

interface LdSettings {
  company_name?: string; tagline?: string; logo?: LdImage | null; support_phones?: string[]; support_email?: string
  address_line1?: string; city?: string; facebook_url?: string; instagram_url?: string; youtube_url?: string; tiktok_url?: string
}

/** Home page: the shop as an Organization (logo, contact, address, social profiles) and the WebSite. */
export function organizationJsonLd(origin: string, s: LdSettings, fallbackLogo = '/icon-512.png') {
  const name = s.company_name || BRAND
  const sameAs = [s.facebook_url, s.instagram_url, s.youtube_url, s.tiktok_url].filter((u): u is string => !!u && /^https?:\/\//.test(u))
  return {
    '@context': 'https://schema.org', '@type': 'OnlineStore', '@id': `${origin}/#organization`, name, url: `${origin}/`,
    logo: `${origin}${s.logo?.url || fallbackLogo}`, description: s.tagline || undefined,
    email: s.support_email || undefined, telephone: s.support_phones?.[0] || undefined,
    address: s.address_line1 ? { '@type': 'PostalAddress', streetAddress: s.address_line1, addressLocality: s.city || 'Dhaka', addressCountry: 'BD' } : undefined,
    contactPoint: s.support_phones?.[0] ? { '@type': 'ContactPoint', telephone: s.support_phones[0], contactType: 'customer service', areaServed: 'BD', availableLanguage: ['en', 'bn'] } : undefined,
    sameAs: sameAs.length ? sameAs : undefined
  }
}

export const websiteJsonLd = (origin: string, name = BRAND) =>
  ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': `${origin}/#website`, name, url: `${origin}/`, inLanguage: 'en-BD', publisher: { '@id': `${origin}/#organization` } })

export function breadcrumbJsonLd(origin: string, p: Pick<LdProduct, 'name' | 'slug' | 'breadcrumb'>) {
  const items = [{ name: 'Home', url: `${origin}/` }]
  p.breadcrumb.forEach((b, i) => items.push({ name: b.name, url: i === 0 ? `${origin}/shop/${b.slug}` : `${origin}/shop/${p.breadcrumb[0].slug}?sub=${b.slug}` }))
  items.push({ name: p.name, url: `${origin}/product/${p.slug}` })
  return { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: x.url })) }
}

/** JSON for a <script type="application/ld+json"> tag: `<` is escaped so content can't close the tag. */
export const ldScript = (data: unknown) => JSON.stringify(data).replace(/</g, '\\u003c')

/** `/shop/bras/?sub=x` → `/shop/bras?sub=x`; the root and internal paths (`/_nuxt`, `/_ipx`, `/api`) stay as they are. */
export function withoutTrailingSlashPath(url: string): string {
  const q = url.search(/[?#]/)
  const path = q === -1 ? url : url.slice(0, q)
  const rest = q === -1 ? '' : url.slice(q)
  if (path.length <= 1 || !path.endsWith('/') || /^\/(_|api\/)/.test(path)) return url
  return (path.replace(/\/+$/, '') || '/') + rest
}
