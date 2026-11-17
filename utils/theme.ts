export interface ThemeTokens {
  [name: string]: string
}

// Built-in Signature fallback if the API is unreachable (THM-06). Values mirror tokens.css.
export const DEFAULT_THEME: ThemeTokens = {}

// Server-derived names only: --color-* (digits allowed, e.g. --color-text-dark-2) and --tile-1..8.
const TOKEN_RE = /^(--color-[a-z0-9-]+|--tile-[1-8])$/
const VALUE_RE = /^#[0-9A-Fa-f]{6}$/

/** SRS THM-06: build a `:root{...}` block from API tokens, accepting only safe names/values. */
export function tokensToCss(tokens: ThemeTokens | null | undefined): string {
  if (!tokens) return ''
  const rules = Object.entries(tokens)
    .filter(([k, val]) => TOKEN_RE.test(k) && VALUE_RE.test(val))
    .map(([k, val]) => `${k}:${val};`)
  return rules.length ? `:root{${rules.join('')}}` : ''
}

// ---- fonts (SRS v1.9 THM-20..THM-23)

/** One area's font selection as sent by GET /theme/ (`fonts.storefront` / `fonts.admin`). */
export interface ThemeFont {
  key: string; display: string; sans: string; stylesheet: string
  display_adjust?: string; sans_adjust?: string; text_size?: string // THM-27..29 (v1.10)
}

// A CSS font stack: quoted family names, letters, digits, spaces, commas and hyphens only.
const STACK_RE = /^[A-Za-z0-9 ,'"-]{1,200}$/
const STYLESHEET_PREFIX = 'https://fonts.googleapis.com/css2?'

/** THM-29 (v1.10): a font-size-adjust value — `none`, or a number 0.2–1.0 computed by the server. */
export function safeAdjust(value: string | null | undefined): string {
  if (!value || value === 'none') return 'none'
  if (!/^\d(\.\d{1,3})?$/.test(value)) return 'none'
  const n = Number(value)
  return n >= 0.2 && n <= 1 ? value : 'none'
}

/** THM-22/29: `:root{--font-display…;--font-sans…;--font-*-adjust…}` from a server font entry; '' when unsafe. */
export function fontToCss(font: ThemeFont | null | undefined): string {
  if (!font || !STACK_RE.test(font.display) || !STACK_RE.test(font.sans)) return ''
  return `:root{--font-display:${font.display};--font-sans:${font.sans};` +
    `--font-display-adjust:${safeAdjust(font.display_adjust)};--font-sans-adjust:${safeAdjust(font.sans_adjust)};}`
}

/** THM-23: the Google Fonts stylesheet URL, accepted only from fonts.googleapis.com css2. */
export function fontStylesheet(font: ThemeFont | null | undefined): string {
  const url = font?.stylesheet ?? ''
  return url.startsWith(STYLESHEET_PREFIX) && !/["'<>\s]/.test(url) ? url : ''
}

/** THM-21: the admin panel uses its own pairing on /admin pages; everything else uses the storefront one. */
export function fontForPath(fonts: { storefront?: ThemeFont; admin?: ThemeFont } | null | undefined, path: string): ThemeFont | undefined {
  return path.startsWith('/admin') ? fonts?.admin : fonts?.storefront
}

export type FontLink = { key: string; rel: 'preconnect' | 'stylesheet'; href: string; crossorigin?: 'anonymous' }

/** THM-23: preconnects + one stylesheet link for the given font. */
export function fontLinks(font: ThemeFont | null | undefined): FontLink[] {
  const href = fontStylesheet(font)
  if (!href) return []
  return [
    { key: 'font-preconnect-api', rel: 'preconnect', href: 'https://fonts.googleapis.com' },
    { key: 'font-preconnect-static', rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' },
    { key: 'theme-font', rel: 'stylesheet', href }
  ]
}
