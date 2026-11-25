// Covers SRS §9 SEO: sitemap.xml, robots.txt (admin disallowed), structured data, canonical.
import { describe, expect, it } from 'vitest'
import { breadcrumbJsonLd, buildRobots, buildSitemap, canonicalOf, categoryTitle, DISALLOWED, ldScript, organizationJsonLd, productDescription, productJsonLd, productTitle, siteOrigin, websiteJsonLd, withBrand, withoutTrailingSlashPath } from '../utils/seo'

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

// SEO copy v1 (docs/seo-copy.md)
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- deep JSON-LD lookups in assertions
type Ld = Record<string, any>
describe('titles and descriptions', () => {
  it('appends the brand once', () => {
    expect(withBrand('Contact Us')).toBe('Contact Us | SoftLadyLux')
    expect(withBrand('SoftLadyLux | Bras Online')).toBe('SoftLadyLux | Bras Online')
    expect(withBrand('')).toBe('SoftLadyLux')
  })
  it('category and product patterns, admin SEO fields win', () => {
    expect(categoryTitle({ name: 'Bras' })).toBe('Bras Online in Bangladesh')
    expect(categoryTitle({ name: 'Bras', seo_title: 'Custom' })).toBe('Custom')
    expect(productTitle({ name: 'Jelly Bra' })).toBe('Jelly Bra Price in Bangladesh')
    expect(productTitle({ name: 'A Very Long Product Name For Testing Length' })).toBe('A Very Long Product Name For Testing Length')
    expect(productTitle({ name: 'X', seo_title: 'Own' })).toBe('Own')
  })
  it('product description: short description + price + COD, within 155 characters', () => {
    const d = productDescription({ short_desc: 'Soft wireless bra.', price: '1500' })
    expect(d).toBe('Soft wireless bra. Price ৳1,500. Cash on delivery all over Bangladesh.')
    expect(productDescription({ short_desc: 'x'.repeat(400), price: '90' }).length).toBeLessThanOrEqual(155)
    expect(productDescription({ seo_description: 'Mine', price: '1' })).toBe('Mine')
  })
})

describe('richer structured data', () => {
  const p = { name: 'Air Bra', slug: 'air-bra', price: '1500', images: [{ url: '/m/a.png' }, { url: '/m/b.png' }], sold_out: false,
    variants: [{ sku: 'A-S', price: '1500' }, { sku: 'A-L', price: '1700' }], breadcrumb: [] }
  it('brand, all images, price range, shipping and returns', () => {
    const j = productJsonLd('https://s.test', p, 'https://s.test', { feeInsideDhaka: '70', feeOutsideDhaka: '130', returnDays: 3 }) as unknown as Ld
    expect(j.brand.name).toBe('SoftLadyLux')
    expect(j.image).toEqual(['https://s.test/m/a.png', 'https://s.test/m/b.png'])
    expect(j.offers).toMatchObject({ '@type': 'AggregateOffer', lowPrice: '1500.00', highPrice: '1700.00', priceCurrency: 'BDT' })
    expect(j.offers.shippingDetails).toHaveLength(2)
    expect(j.offers.hasMerchantReturnPolicy.merchantReturnDays).toBe(3)
  })
  it('organization with contact, address and only real social URLs', () => {
    const o = organizationJsonLd('https://s.test', { company_name: 'SoftLadyLux', support_phones: ['0154'], address_line1: 'Mohakhali', city: 'Dhaka', facebook_url: 'https://fb.com/x', instagram_url: '' }) as unknown as Ld
    expect(o.logo).toBe('https://s.test/icon-512.png')
    expect(o.sameAs).toEqual(['https://fb.com/x'])
    expect(o.address.addressCountry).toBe('BD')
    expect(websiteJsonLd('https://s.test').url).toBe('https://s.test/')
  })
  it('sitemap lists product images', () => {
    const xml = buildSitemap('https://s.test', [{ path: '/product/a', images: ['/media/a.jpg'] }])
    expect(xml).toContain('xmlns:image=')
    expect(xml).toContain('<image:loc>https://s.test/media/a.jpg</image:loc>')
  })
})

describe('trailing slash', () => {
  it('strips it from page paths only', () => {
    expect(withoutTrailingSlashPath('/shop/bras/')).toBe('/shop/bras')
    expect(withoutTrailingSlashPath('/shop/bras/?sub=x')).toBe('/shop/bras?sub=x')
    expect(withoutTrailingSlashPath('/')).toBe('/')
    expect(withoutTrailingSlashPath('/shop/bras')).toBe('/shop/bras')
    expect(withoutTrailingSlashPath('/_nuxt/x/')).toBe('/_nuxt/x/')
    expect(withoutTrailingSlashPath('/api/v1/products/')).toBe('/api/v1/products/')
  })
})
