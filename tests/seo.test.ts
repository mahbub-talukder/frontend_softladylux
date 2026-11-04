// Covers SRS §9 SEO: sitemap.xml, robots.txt (admin disallowed), structured data, canonical.
import { describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, buildRobots, buildSitemap, canonicalOf, DISALLOWED, ldScript, productJsonLd, siteOrigin } from '../utils/seo'

describe('sitemap', () => {
  it('lists absolute URLs once each and escapes XML', () => {
    const xml = buildSitemap('https://shop.example/', [{ path: '/' , priority: 1 }, { path: '/shop/bras', changefreq: 'daily' }, { path: '/shop/bras' }, { path: '/a&b' }, { path: 'no-slash' }])
    expect(xml.startsWith('<?xml')).toBe(true)
    expect(xml.match(/<loc>/g)).toHaveLength(3)
    expect(xml).toContain('<loc>https://shop.example/shop/bras</loc>')
    expect(xml).toContain('<loc>https://shop.example/a&amp;b</loc>')
    expect(xml).not.toContain('no-slash')
  })
})

describe('robots', () => {
  it('disallows the admin and private pages and points at the sitemap', () => {
    const r = buildRobots('https://shop.example')
    expect(r).toContain('Disallow: /admin')
    for (const p of DISALLOWED) expect(r).toContain(`Disallow: ${p}`)
    expect(r).toContain('Sitemap: https://shop.example/sitemap.xml')
    expect(r).toContain('Allow: /')
  })
})

describe('origin and canonical', () => {
  it('prefers the configured site URL, otherwise the request host', () => {
    expect(siteOrigin('https://shop.example/', 'x.test', 'http')).toBe('https://shop.example')
    expect(siteOrigin(undefined, 'shop.test', 'https')).toBe('https://shop.test')
    expect(siteOrigin('', undefined, undefined)).toBe('http://localhost')
  })
  it('drops query and hash from the canonical URL', () => {
    expect(canonicalOf('https://s.test', '/shop/bras?sub=air-bra#top')).toBe('https://s.test/shop/bras')
    expect(canonicalOf('https://s.test/', '')).toBe('https://s.test/')
  })
})

describe('structured data', () => {
  const p = { name: 'Air Bra', slug: 'air-bra', price: '1500', short_desc: 'Light', image: { url: '/media/a.png' }, sold_out: false, variants: [{ sku: 'AIR-1' }], breadcrumb: [{ name: 'Bras', slug: 'bras' }, { name: 'Air Bra', slug: 'air-bra' }] }
  it('describes the product with BDT price and availability', () => {
    const j = productJsonLd('https://s.test', p)
    expect(j['@type']).toBe('Product')
    expect(j.offers).toMatchObject({ priceCurrency: 'BDT', price: '1500.00', availability: 'https://schema.org/InStock' })
    expect(j.image).toBe('https://s.test/media/a.png')
    expect(productJsonLd('https://s.test', { ...p, sold_out: true }).offers.availability).toContain('OutOfStock')
  })
  it('builds Home > Category > Sub-category > Product breadcrumbs (CAT-22)', () => {
    const b = breadcrumbJsonLd('https://s.test', p)
    expect(b.itemListElement.map((x) => x.name)).toEqual(['Home', 'Bras', 'Air Bra', 'Air Bra'])
    expect(b.itemListElement[2].item).toBe('https://s.test/shop/bras?sub=air-bra')
    expect(b.itemListElement.map((x) => x.position)).toEqual([1, 2, 3, 4])
  })
  it('cannot be used to close the script tag', () => {
    expect(ldScript({ name: '</script><script>alert(1)</script>' })).not.toContain('</script>')
  })
})
