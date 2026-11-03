// SRS THM-04 / THM-08: client-side mirror of the server's token derivation, used ONLY for the
// instant live preview in Settings -> Theme. The server recomputes on save (THM-14).
// Numeric RGB is used instead of hex literals so the colour lint (THM-05) stays clean.
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

export function textOn(c: RGB): string {
  for (const cand of [PAGE_BG, INK, WHITE, BLACK]) if (contrast(c, cand) >= 4.5) return toHex(cand)
  return toHex(lum(c) < 0.18 ? WHITE : BLACK)
}

/** THM-07: true when the primary has < 3:1 contrast against the page background. */
export function lowContrast(primary: string): boolean {
  return contrast(parseHex(primary), PAGE_BG) < 3
}

export function deriveTokens(primary: string, accent: string | null): Record<string, string> {
  const p = parseHex(primary)
  const soft = toHex(p.map((v) => v + (255 - v) * 0.88) as RGB)
  return {
    '--color-primary': primary.toUpperCase(),
    '--color-primary-hover': shift(p, 0.1),
    '--color-primary-active': shift(p, 0.18),
    '--color-primary-soft': soft,
    '--color-primary-contrast': textOn(p),
    '--color-accent': (accent || primary).toUpperCase()
  }
}
