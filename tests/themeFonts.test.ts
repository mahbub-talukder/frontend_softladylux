// Covers SRS v1.9 THM-21/22/23: font tokens and stylesheet links built from the server's pairing entry.
import { describe, expect, it } from 'vitest'
import { fontForPath, fontLinks, fontStylesheet, fontToCss, safeAdjust, type ThemeFont } from '../utils/theme'

const editorial: ThemeFont = {
  key: 'editorial',
  display: "'Playfair Display', Georgia, 'Times New Roman', serif",
  sans: "'Inter', system-ui, -apple-system, 'Segoe UI', Arial, sans-serif",
  stylesheet: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600&family=Inter:wght@300;400;500;600&display=swap'
}
const clean: ThemeFont = { ...editorial, key: 'clean', display: "'Inter', sans-serif", sans: "'Inter', sans-serif" }

describe('fontToCss', () => {
  it('writes both font tokens on :root', () => {
    expect(fontToCss(editorial)).toBe(`:root{--font-display:${editorial.display};--font-sans:${editorial.sans};--font-display-adjust:none;--font-sans-adjust:none;}`)
  })
  it('rejects unsafe stacks and missing fonts', () => {
    expect(fontToCss({ ...editorial, display: "x;}body{color:red" })).toBe('')
    expect(fontToCss(null)).toBe('')
  })
})

describe('fontStylesheet / fontLinks', () => {
  it('accepts only Google Fonts css2 URLs', () => {
    expect(fontStylesheet(editorial)).toBe(editorial.stylesheet)
    expect(fontStylesheet({ ...editorial, stylesheet: 'https://evil.example/x.css' })).toBe('')
    expect(fontStylesheet({ ...editorial, stylesheet: 'https://fonts.googleapis.com/css2?family=A" onload="x' })).toBe('')
  })
  it('adds preconnects and exactly one stylesheet', () => {
    const links = fontLinks(editorial)
    expect(links.filter((l) => l.rel === 'stylesheet').map((l) => l.href)).toEqual([editorial.stylesheet])
    expect(links.some((l) => l.href === 'https://fonts.gstatic.com' && 'crossorigin' in l)).toBe(true)
    expect(fontLinks(undefined)).toEqual([])
  })
})

describe('fontForPath', () => {
  it('uses the admin pairing on /admin and the storefront pairing elsewhere', () => {
    const fonts = { storefront: editorial, admin: clean }
    expect(fontForPath(fonts, '/admin/orders')?.key).toBe('clean')
    expect(fontForPath(fonts, '/')?.key).toBe('editorial')
    expect(fontForPath(fonts, '/account/orders/SLL-1/invoice')?.key).toBe('editorial')
  })
})

// SRS v1.10 THM-29: tuned font-size-adjust values are range-checked before they reach the page.

describe('safeAdjust / adjust tokens', () => {
  it('accepts none and numbers 0.2–1.0 only', () => {
    expect(safeAdjust('0.452')).toBe('0.452')
    expect(safeAdjust('none')).toBe('none')
    expect(safeAdjust(undefined)).toBe('none')
    expect(safeAdjust('1.5')).toBe('none')
    expect(safeAdjust('0.1')).toBe('none')
    expect(safeAdjust('0.4;}body{x:y')).toBe('none')
  })
  it('writes both adjust tokens next to the families', () => {
    const css = fontToCss({ ...editorial, display_adjust: '0.452', sans_adjust: '0.481' })
    expect(css).toContain('--font-display-adjust:0.452;')
    expect(css).toContain('--font-sans-adjust:0.481;')
    expect(fontToCss(editorial)).toContain('--font-display-adjust:none;--font-sans-adjust:none;')
  })
})
