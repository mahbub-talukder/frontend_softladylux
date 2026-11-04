// Covers SRS INS-03/INS-04/INS-05, scenario 21 (consent gate) and 'no personal data' rule.
import { describe, expect, it } from 'vitest'
import { clickInfo, CONSENT_DENIED, gtmUrl, parseConsent, sanitizeEvent, validGtmId, type TrackEl } from '../utils/consent'

describe('consent choice', () => {
  it.each([null, undefined, '', 'yes', 'GRANTED', '1', '{}'])('%s means undecided (banner shows)', (raw) => expect(parseConsent(raw as string)).toBeNull())
  it('remembers accept and decline', () => {
    expect(parseConsent('granted')).toBe('granted')
    expect(parseConsent('denied')).toBe('denied')
  })
  it('defaults every storage type to denied (Consent Mode)', () => {
    expect(Object.values(CONSENT_DENIED).every((v) => v === 'denied')).toBe(true)
  })
})

describe('GTM id', () => {
  it('accepts only well-formed container IDs', () => {
    for (const ok of ['GTM-ABC123', 'GTM-XXXXXXX', ' GTM-5H9K2LM ']) expect(validGtmId(ok.trim())).toBe(true)
    for (const bad of ['', null, undefined, 'UA-123', 'GTM-', 'gtm-abc123', 'GTM-ABC123"><script>', 'GTM-AB']) expect(validGtmId(bad as string)).toBe(false)
  })
  it('builds the script URL from the ID only', () => {
    expect(gtmUrl('GTM-ABC123')).toBe('https://www.googletagmanager.com/gtm.js?id=GTM-ABC123')
  })
})

describe('sanitizeEvent (no personal data, INS-05)', () => {
  it('drops personal keys and values', () => {
    const out = sanitizeEvent({
      event: 'purchase', transaction_id: 'SLL-261104-0001', value: 1860, name: 'Nusrat', phone: '01712345678', email: 'a@b.co', address_line: 'x', trx_id: '8N7A',
      items: [{ item_id: 'air-bra', item_name: 'Air Bra', price: 1500, customer_phone: '01712345678' }], note: 'call me', contact: 'reach me at nusrat@example.com', alt: '+8801712345678'
    })
    expect(out).toEqual({ event: 'purchase', transaction_id: 'SLL-261104-0001', value: 1860, items: [{ item_id: 'air-bra', item_name: 'Air Bra', price: 1500 }] })
  })
  it('keeps normal strings and numbers and is bounded', () => {
    expect(sanitizeEvent({ search_term: 'plunge bra', n: 3, ok: true })).toEqual({ search_term: 'plunge bra', n: 3, ok: true })
    const deep = { a: { b: { c: { d: { e: { f: 1 } } } } } }
    expect(JSON.stringify(sanitizeEvent(deep))).not.toContain('"f"')
  })
})

describe('data-track -> ui_click', () => {
  const el = (attrs: Record<string, string>, tag: string, parent: TrackEl | null = null): TrackEl => {
    const self: TrackEl = {
      tagName: tag.toUpperCase(), parentElement: parent, getAttribute: (n) => attrs[n] ?? null,
      closest(sel: string) { for (let n: TrackEl | null = self; n; n = n.parentElement ?? null) if (sel === '[data-track]' && n.getAttribute('data-track')) return n; return null }
    }
    return self
  }
  it('reports name, location and path without the query string', () => {
    const header = el({}, 'header')
    const btn = el({ 'data-track': 'header_track_order' }, 'a', header)
    expect(clickInfo(btn, '/shop/bras?sub=air-bra')).toEqual({ button_name: 'header_track_order', button_location: 'header', page_path: '/shop/bras' })
  })
  it('finds the tracked ancestor of an inner icon', () => {
    const main = el({}, 'main')
    const btn = el({ 'data-track': 'add_to_bag' }, 'button', main)
    expect(clickInfo(el({}, 'svg', btn), '/product/x')?.button_name).toBe('add_to_bag')
  })
  it('ignores untracked clicks and unsafe names', () => {
    expect(clickInfo(el({}, 'div'), '/')).toBeNull()
    expect(clickInfo(el({ 'data-track': 'Bad Name!' }, 'a'), '/')).toBeNull()
    expect(clickInfo(null, '/')).toBeNull()
  })
})
