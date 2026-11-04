// Covers SRS INS-03/INS-04, scenario 21: GTM loads only after Accept; Decline loads nothing from
// Google and is remembered. A tiny fake window/document stands in for the browser.
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useConsentStore } from '../stores/consent'

type Win = { dataLayer: unknown[]; localStorage: { getItem(k: string): string | null; setItem(k: string, v: string): void } }
let scripts: string[]
let storage: Record<string, string>
let win: Win

function browser(opts: { blocked?: boolean } = {}) {
  scripts = []; storage = {}
  win = { dataLayer: [], localStorage: {
    getItem: (k) => { if (opts.blocked) throw new Error('blocked'); return storage[k] ?? null },
    setItem: (k, v) => { if (opts.blocked) throw new Error('blocked'); storage[k] = v }
  } }
  const doc = { createElement: () => ({} as Record<string, unknown>), head: { appendChild: (el: Record<string, unknown>) => { scripts.push(String(el.src)) } } }
  Object.assign(globalThis, { window: win, document: doc })
}
const gtagCalls = () => win.dataLayer.filter((x) => Array.isArray(x)) as unknown[][]

beforeEach(() => { setActivePinia(createPinia()); browser() })

describe('consent gate (scenario 21)', () => {
  it('starts as denied and loads nothing before a choice', () => {
    const c = useConsentStore(); c.init('GTM-ABC123')
    expect(gtagCalls()[0].slice(0, 2)).toEqual(['consent', 'default'])
    expect(gtagCalls()[0][2]).toMatchObject({ analytics_storage: 'denied', ad_storage: 'denied' })
    expect(scripts).toEqual([]); expect(c.needsChoice).toBe(true); expect(c.loaded).toBe(false)
  })
  it('Accept loads GTM once, grants analytics only, and is remembered', () => {
    const c = useConsentStore(); c.init('GTM-ABC123'); c.accept(); c.accept()
    expect(scripts).toEqual(['https://www.googletagmanager.com/gtm.js?id=GTM-ABC123'])
    expect(gtagCalls().some((a) => a[1] === 'update' && (a[2] as Record<string, string>).analytics_storage === 'granted')).toBe(true)
    expect(gtagCalls().some((a) => (a[2] as Record<string, string>)?.ad_storage === 'granted')).toBe(false)
    expect(storage.sll_consent).toBe('granted'); expect(c.needsChoice).toBe(false)
    expect(win.dataLayer.some((x) => (x as { event?: string }).event === 'gtm.js')).toBe(true)
  })
  it('Decline loads nothing from Google and is remembered across visits', () => {
    const c = useConsentStore(); c.init('GTM-ABC123'); c.decline()
    expect(scripts).toEqual([]); expect(storage.sll_consent).toBe('denied')
    setActivePinia(createPinia()); win.dataLayer = []
    const next = useConsentStore(); next.init('GTM-ABC123')  // next visit
    expect(next.choice).toBe('denied'); expect(next.needsChoice).toBe(false); expect(scripts).toEqual([])
  })
  it('a returning visitor who accepted gets GTM without being asked again', () => {
    storage.sll_consent = 'granted'
    const c = useConsentStore(); c.init('GTM-ABC123')
    expect(c.needsChoice).toBe(false); expect(scripts).toHaveLength(1)
  })
  it('no GTM id (analytics disabled): no banner and no script, even if accepted earlier', () => {
    storage.sll_consent = 'granted'
    const c = useConsentStore(); c.init('')
    expect(c.needsChoice).toBe(false); expect(scripts).toEqual([])
    c.accept(); expect(scripts).toEqual([])
  })
  it('refuses a malformed container id (never builds a script URL from it)', () => {
    const c = useConsentStore(); c.init('GTM-ABC"><script>'); c.accept()
    expect(scripts).toEqual([]); expect(c.gtmId).toBe('')
  })
  it('works when storage is blocked (private mode): choice lasts for the visit', () => {
    browser({ blocked: true })
    const c = useConsentStore(); c.init('GTM-ABC123'); expect(c.needsChoice).toBe(true)
    c.decline(); expect(c.choice).toBe('denied'); expect(c.needsChoice).toBe(false)
  })
  it('junk in storage means undecided', () => {
    storage.sll_consent = 'maybe'
    const c = useConsentStore(); c.init('GTM-ABC123'); expect(c.needsChoice).toBe(true)
  })
})
