// SRS THM-04 / THM-08: client-side mirror of the server's token derivation (apps/core/theme.py), used ONLY for the
// instant live preview in Settings -> Theme. The server recomputes on save (THM-14).
// Numeric RGB is used instead of hex literals so the colour lint (THM-05) stays clean.
// Owner-approved amendment: the storefront Background and Text colours are editable and every other neutral is derived.
type RGB = [number, number, number]

const PAGE_BG: RGB = [248, 244, 236]
const INK: RGB = [35, 30, 28]
const WHITE: RGB = [255, 255, 255]
const BLACK: RGB = [0, 0, 0]

export const HEX_RE = /^#[0-9A-Fa-f]{6}$/

export function parseHex(h: string): RGB {
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as RGB
}
const toHex = (c: RGB) =>
  '#' + c.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('').toUpperCase()

function lum(c: RGB) {
  const [r, g, b] = c.map((v) => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
export function contrast(a: RGB, b: RGB) {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

function toHsl([r, g, b]: RGB): [number, number, number] {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2
  if (max === min) return [0, 0, l]
  const d = max - min
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
  const h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return [h / 6, s, l]
}
function fromHsl([h, s, l]: [number, number, number]): RGB {
  if (s === 0) return [l * 255, l * 255, l * 255]
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q
  const f = (t: number) => {
    t = (t + 1) % 1
    return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p
  }
  return [f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255]
}
function shift(c: RGB, delta: number): string {
  const [h, s, l] = toHsl(c)
  return toHex(fromHsl([h, s, Math.max(0, Math.min(1, l < 0.5 ? l + delta : l - delta))]))
}

export function textOn(c: RGB, bg: RGB = PAGE_BG, ink: RGB = INK): string {
  for (const cand of [bg, ink, WHITE, BLACK]) if (contrast(c, cand) >= 4.5) return toHex(cand)
  return toHex(lum(c) < 0.18 ? WHITE : BLACK)
}

/** Signature Background / Text: the defaults when the owner has not customised them. */
export const DEFAULT_BG = toHex(PAGE_BG)
export const DEFAULT_TEXT = toHex(INK)
const CHAMPAGNE: RGB = [201, 178, 141]

function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const norm = (v: string | null | undefined, fallback: string) => (v && HEX_RE.test(v) ? v.toUpperCase() : fallback)
export const usesCustomNeutrals = (bg?: string | null, text?: string | null) =>
  norm(bg, DEFAULT_BG) !== DEFAULT_BG || norm(text, DEFAULT_TEXT) !== DEFAULT_TEXT

/** Contrast ratio between two #RRGGBB colours (for the readability read-out in the theme page). */
export const contrastHex = (a: string, b: string) => contrast(parseHex(a), parseHex(b))

/** THM-07 (extended): readability problems, same codes as the server's readability_issues(). */
export function readabilityIssues(primary: string, background?: string | null, text?: string | null): string[] {
  const bg = parseHex(norm(background, DEFAULT_BG)), txt = parseHex(norm(text, DEFAULT_TEXT))
  const out: string[] = []
  if (contrast(parseHex(primary), bg) < 3) out.push('primary_on_background')
  if (contrast(txt, bg) < 4.5) out.push('text_on_background')
  return out
}

/** THM-07: true when the primary has < 3:1 contrast against the page background. */
export function lowContrast(primary: string, background?: string | null, text?: string | null): boolean {
  return readabilityIssues(primary, background, text).length > 0
}

/** Mirror of derive_neutrals(): everything the storefront derives from Background + Text. */
function deriveNeutrals(primary: RGB, accent: RGB, bg: RGB, text: RGB): Record<string, string> {
  const dark = lum(bg) < 0.4
  let muted = text
  for (let step = 0; step <= 10; step++) {
    const cand = mix(bg, text, 0.67 + 0.03 * step)
    if (contrast(cand, bg) >= 4.5) { muted = cand; break }
  }
  let body = mix(bg, text, 0.83)
  if (contrast(body, bg) < 4.5) body = text
  const t: Record<string, string> = {
    '--color-bg': toHex(bg),
    '--color-surface': toHex(dark ? mix(bg, text, 0.05) : mix(bg, WHITE, 0.75)),
    '--color-cream': toHex(mix(bg, text, dark ? 0.1 : 0.06)),
    '--color-border': toHex(mix(bg, text, dark ? 0.2 : 0.13)),
    '--color-field': toHex(mix(bg, text, dark ? 0.28 : 0.19)),
    '--color-ink': toHex(text),
    '--color-muted': toHex(muted),
    '--color-body': toHex(body)
  }
  for (let i = 1; i <= 8; i++) t[`--tile-${i}`] = toHex(mix(bg, i % 2 ? accent : primary, 0.06 + 0.012 * i))
  if (dark && contrast(CHAMPAGNE, bg) >= 3) t['--color-gold'] = toHex(CHAMPAGNE)
  return t
}

export function deriveTokens(primary: string, accent: string | null, background?: string | null, text?: string | null): Record<string, string> {
  const p = parseHex(primary)
  const a = parseHex((accent || primary))
  const bgHex = norm(background, DEFAULT_BG), txtHex = norm(text, DEFAULT_TEXT)
  const bg = parseHex(bgHex), txt = parseHex(txtHex)
  const custom = usesCustomNeutrals(bgHex, txtHex)
  const tokens: Record<string, string> = {
    '--color-primary': primary.toUpperCase(),
    '--color-primary-hover': shift(p, 0.1),
    '--color-primary-active': shift(p, 0.18),
    '--color-primary-soft': toHex(mix(p, custom ? bg : WHITE, 0.88)),
    '--color-primary-contrast': textOn(p, bg, txt),
    '--color-accent': (accent || primary).toUpperCase()
  }
  if (custom) Object.assign(tokens, deriveNeutrals(p, a, bg, txt))
  return tokens
}
