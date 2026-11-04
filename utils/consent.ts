// SRS INS-03/INS-04/INS-05. Pure helpers (unit-tested). Analytics are off until the visitor accepts:
// Google Consent Mode defaults to denied, GTM is injected only after Accept, Decline is remembered.
export const CONSENT_KEY = 'sll_consent'
export type Consent = 'granted' | 'denied'

export function parseConsent(raw: string | null | undefined): Consent | null {
  return raw === 'granted' || raw === 'denied' ? raw : null // anything else = not decided yet
}

export const GTM_ID_RE = /^GTM-[A-Z0-9]{4,12}$/
/** Only a well-formed container ID is ever put in a script URL (SET-09). */
export const validGtmId = (id: string | null | undefined): id is string => !!id && GTM_ID_RE.test(id.trim())
export const gtmUrl = (id: string) => `https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id.trim())}`

export const CONSENT_DENIED = { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied', analytics_storage: 'denied' } as const
export const CONSENT_GRANTED_ANALYTICS = { analytics_storage: 'granted' } as const // ads stay denied

// ---- INS-05: no personal data is ever pushed (name, phone, address, email, payment identifiers)
const PERSONAL_KEY = /name|phone|mobile|email|address|thana|district|trx|sender|password|token|note/i
const EMAIL = /[^\s@]+@[^\s@]+\.[^\s@]+/
const BD_PHONE = /(?:\+?880|0)1[3-9]\d{8}/

export function sanitizeEvent<T>(value: T, depth = 0): T {
  if (depth > 4) return undefined as T
  if (Array.isArray(value)) return value.map((v) => sanitizeEvent(v, depth + 1)).filter((v) => v !== undefined) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (PERSONAL_KEY.test(k) && k !== 'item_name') continue
      const s = sanitizeEvent(v, depth + 1)
      if (s !== undefined) out[k] = s
    }
    return out as T
  }
  if (typeof value === 'string' && (EMAIL.test(value) || BD_PHONE.test(value))) return undefined as T
  return value
}

// ---- data-track -> ui_click (INS-05)
export interface ClickInfo { button_name: string; button_location: string; page_path: string }
const LANDMARKS: Record<string, string> = { header: 'header', footer: 'footer', nav: 'nav', main: 'main', aside: 'sidebar', dialog: 'dialog' }

/** Minimal element shape so the logic is testable without a DOM. */
export interface TrackEl { getAttribute(n: string): string | null; closest?: (sel: string) => TrackEl | null; tagName?: string; parentElement?: TrackEl | null }

export function clickInfo(target: TrackEl | null, pagePath: string): ClickInfo | null {
  let el = target?.closest ? target.closest('[data-track]') : null
  if (!el) return null
  const name = (el.getAttribute('data-track') || '').trim()
  if (!/^[a-z0-9_]{2,40}$/.test(name)) return null
  let location = 'page'
  for (let n: TrackEl | null | undefined = el; n; n = n.parentElement) {
    const l = LANDMARKS[(n.tagName || '').toLowerCase()]
    if (l) { location = l; break }
    el = n
  }
  return { button_name: name, button_location: location, page_path: pagePath.split('?')[0] }
}
