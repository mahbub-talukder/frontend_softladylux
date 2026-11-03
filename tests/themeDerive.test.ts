// Covers SRS THM-04/THM-07/THM-08: the client preview matches the server derivation.
import { describe, expect, it } from 'vitest'
import { deriveTokens, lowContrast, textOn, parseHex } from '../utils/themeDerive'

// Expected values produced by the server's apps/core/theme.py derive_tokens().
const SERVER = [
  {
    "--color-primary": "#6B4E43",
    "--color-primary-hover": "#8A6557",
    "--color-primary-active": "#A17869",
    "--color-primary-soft": "#EDEAE8",
    "--color-primary-contrast": "#F8F4EC",
    "--color-accent": "#D9BDAA"
  },
  {
    "--color-primary": "#231E1C",
    "--color-primary-hover": "#3F3633",
    "--color-primary-active": "#564A45",
    "--color-primary-soft": "#E5E4E4",
    "--color-primary-contrast": "#F8F4EC",
    "--color-accent": "#8C5550"
  },
  {
    "--color-primary": "#FFE9A8",
    "--color-primary-hover": "#FFDC75",
    "--color-primary-active": "#FFD24C",
    "--color-primary-soft": "#FFFCF5",
    "--color-primary-contrast": "#231E1C",
    "--color-accent": "#FFE9A8"
  }
]

describe('deriveTokens', () => {
  it('returns all six palette tokens, upper-case', () => {
    const t = deriveTokens('#6b4e43', '#d9bdaa')
    expect(Object.keys(t).sort()).toEqual([
      '--color-accent', '--color-primary', '--color-primary-active',
      '--color-primary-contrast', '--color-primary-hover', '--color-primary-soft'
    ])
    expect(t['--color-primary']).toBe('#6B4E43')
    expect(t['--color-accent']).toBe('#D9BDAA')
  })
  it('falls back to primary when accent is empty', () => {
    expect(deriveTokens('#A8475A', null)['--color-accent']).toBe('#A8475A')
  })
  it('matches the server for Signature (verified against apps/core/theme.py)', () => {
    const t = deriveTokens('#231E1C', '#8C5550')
    expect(t['--color-primary-contrast']).toBe('#F8F4EC')
  })
  it('flips text colour on a light primary (scenario 16)', () => {
    expect(['#231E1C', '#000000']).toContain(textOn(parseHex('#FFE9A8')))
  })
})

describe('parity with the server derivation (THM-14)', () => {
  it.each([
    ['#6B4E43', '#D9BDAA', 0], ['#231E1C', '#8C5550', 1], ['#FFE9A8', null, 2]
  ])('%s', (p, a, i) => {
    expect(deriveTokens(p as string, a as string | null)).toEqual(SERVER[i as number])
  })
})

describe('lowContrast', () => {
  it('warns for pale primaries only', () => {
    expect(lowContrast('#F5EFE0')).toBe(true)
    expect(lowContrast('#231E1C')).toBe(false)
  })
})
