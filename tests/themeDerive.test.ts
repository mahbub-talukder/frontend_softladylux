// Covers SRS THM-04/THM-07/THM-08: the client preview matches the server derivation.
import { describe, expect, it } from 'vitest'
import { DEFAULT_BG, DEFAULT_TEXT, deriveTokens, lowContrast, parseHex, readabilityIssues, textOn, usesCustomNeutrals } from '../utils/themeDerive'

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


// Task 1 amendment: Background + Text colours. Expected values are the server's derive_tokens(primary, accent, bg, text).
const NEUTRALS: [string, string | null, string, string, Record<string, string>][] = [
  ["#6B4E43", "#D9BDAA", "#FFF4F4", "#2B1B1B", {"--color-primary": "#6B4E43", "--color-primary-hover": "#8A6557", "--color-primary-active": "#A17869", "--color-primary-soft": "#EDE0DF", "--color-primary-contrast": "#FFF4F4", "--color-accent": "#D9BDAA", "--color-bg": "#FFF4F4", "--color-surface": "#FFFCFC", "--color-cream": "#F2E7E7", "--color-border": "#E3D8D8", "--color-field": "#D7CBCB", "--color-ink": "#2B1B1B", "--color-muted": "#716363", "--color-body": "#4F4040", "--tile-1": "#FCF0EF", "--tile-2": "#F3E6E5", "--tile-3": "#FBEFED", "--tile-4": "#EFE2E1", "--tile-5": "#FAEDEB", "--tile-6": "#EBDEDD", "--tile-7": "#FAECE9", "--tile-8": "#E8DAD8"}],
  ["#C9B28D", "#8C5550", "#14110F", "#F2EBE0", {"--color-primary": "#C9B28D", "--color-primary-hover": "#B99B6A", "--color-primary-active": "#AA8850", "--color-primary-soft": "#2A241E", "--color-primary-contrast": "#14110F", "--color-accent": "#8C5550", "--color-bg": "#14110F", "--color-surface": "#1F1C19", "--color-cream": "#2A2724", "--color-border": "#403D39", "--color-field": "#524E4A", "--color-ink": "#F2EBE0", "--color-muted": "#A9A39B", "--color-body": "#CCC6BC", "--tile-1": "#1D1614", "--tile-2": "#231F1A", "--tile-3": "#201815", "--tile-4": "#28221D", "--tile-5": "#221917", "--tile-6": "#2C2620", "--tile-7": "#251B18", "--tile-8": "#302A23", "--color-gold": "#C9B28D"}],
  ["#1F6B54", null, "#EEF3EF", "#10231A", {"--color-primary": "#1F6B54", "--color-primary-hover": "#2A9373", "--color-primary-active": "#34B28C", "--color-primary-soft": "#D5E3DC", "--color-primary-contrast": "#EEF3EF", "--color-accent": "#1F6B54", "--color-bg": "#EEF3EF", "--color-surface": "#FBFCFB", "--color-cream": "#E1E7E2", "--color-border": "#D1D8D3", "--color-field": "#C4CBC7", "--color-ink": "#10231A", "--color-muted": "#596860", "--color-body": "#36463E", "--tile-1": "#DFE9E4", "--tile-2": "#DDE8E2", "--tile-3": "#DAE6E0", "--tile-4": "#D8E4DE", "--tile-5": "#D5E3DC", "--tile-6": "#D3E1DB", "--tile-7": "#D0DFD9", "--tile-8": "#CEDED7"}],
  ["#A8475A", "#E8B4B8", "#FFFFFF", "#000000", {"--color-primary": "#A8475A", "--color-primary-hover": "#BE6476", "--color-primary-active": "#CA818F", "--color-primary-soft": "#F5E9EB", "--color-primary-contrast": "#FFFFFF", "--color-accent": "#E8B4B8", "--color-bg": "#FFFFFF", "--color-surface": "#FFFFFF", "--color-cream": "#F0F0F0", "--color-border": "#DEDEDE", "--color-field": "#CFCFCF", "--color-ink": "#000000", "--color-muted": "#545454", "--color-body": "#2B2B2B", "--tile-1": "#FDFAFA", "--tile-2": "#F8F0F1", "--tile-3": "#FDF8F8", "--tile-4": "#F6EBED", "--tile-5": "#FCF6F6", "--tile-6": "#F4E7E9", "--tile-7": "#FCF4F5", "--tile-8": "#F1E2E5"}],
  ["#5B2A58", "#D79ACB", "#0B1020", "#DDE6FF", {"--color-primary": "#5B2A58", "--color-primary-hover": "#7E3A7A", "--color-primary-active": "#9A4795", "--color-primary-soft": "#151327", "--color-primary-contrast": "#DDE6FF", "--color-accent": "#D79ACB", "--color-bg": "#0B1020", "--color-surface": "#161B2B", "--color-cream": "#202536", "--color-border": "#353B4D", "--color-field": "#464C5E", "--color-ink": "#DDE6FF", "--color-muted": "#989FB5", "--color-body": "#B9C2D9", "--tile-1": "#1A1A2C", "--tile-2": "#121225", "--tile-3": "#1F1D30", "--tile-4": "#141326", "--tile-5": "#232135", "--tile-6": "#161327", "--tile-7": "#282439", "--tile-8": "#171429", "--color-gold": "#C9B28D"}]
]

describe('Background + Text derivation (parity with apps/core/theme.py)', () => {
  it.each(NEUTRALS.map((c, i) => [i, c[2], c[3]]))('case %i: bg %s text %s', (i, _bg, _txt) => {
    const [p, a, bg, txt, want] = NEUTRALS[i as number]
    expect(deriveTokens(p, a, bg, txt)).toEqual(want)
  })
  it('emits only the six palette tokens while Background and Text are the Signature defaults', () => {
    expect(Object.keys(deriveTokens('#6B4E43', '#D9BDAA', DEFAULT_BG, DEFAULT_TEXT))).toHaveLength(6)
    expect(usesCustomNeutrals(DEFAULT_BG, DEFAULT_TEXT)).toBe(false)
    expect(usesCustomNeutrals('#FFFFFF', DEFAULT_TEXT)).toBe(true)
  })
  it('flags unreadable combinations like the server', () => {
    expect(readabilityIssues('#231E1C', '#F8F4EC', '#E8E0D0')).toEqual(['text_on_background'])
    expect(readabilityIssues('#F5EFE0', '#F8F4EC', '#231E1C')).toEqual(['primary_on_background'])
    expect(readabilityIssues('#F2EBE0', '#14110F', '#F2EBE0')).toEqual([])
  })
})
