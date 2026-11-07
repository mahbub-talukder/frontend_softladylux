import { describe, expect, it } from 'vitest'
import { makeSku, uniqueSku } from '~/utils/sku'

// SRS CAT-03 / ADM-03. Expected values were produced by the backend `make_sku` formula
// (backend/apps/catalog/services.py) so the preview matches what the server will generate.
describe('makeSku (parity with backend make_sku)', () => {
  it.each([
    ['', 'Seamless Brief', 'Nude', 'M', 'SEAMLESS-NUDE-M'],
    ['', 'Seamless Brief', 'Light Pink', 'XL/2XL', 'SEAMLESS-LIGH-XL2X'],
    ['PFX', 'x', 'Black', '', 'PFX-BLAC'],
    ['', '', '', '', 'SKU'],
    ['', 'Lace Bra', '', '32B', 'LACEBRA-32B'],
    ['', 'T-Shirt 2', 'Navy Blue', 'S', 'TSHIRT2-NAVY-S']
  ])('prefix=%j name=%j colour=%j size=%j -> %s', (p, n, c, s, want) => {
    expect(makeSku(p, n, c, s)).toBe(want)
  })
  it('drops parts that clean to nothing (non-Latin colour) instead of leaving a double dash', () => {
    expect(makeSku('', 'Lace Bra', 'লাল', 'M')).toBe('LACEBRA-M')
  })
  it('upper-cases a typed prefix and never exceeds 40 characters', () => {
    expect(makeSku('abc', 'x', 'Red', 'S')).toBe('ABC-RED-S')
    expect(makeSku('A'.repeat(60), 'x', 'Black', 'XXL').length).toBeLessThanOrEqual(40)
  })
})

describe('uniqueSku', () => {
  it('returns the base when free', () => expect(uniqueSku('A-B', [])).toBe('A-B'))
  it('appends -2, -3 like the server, case-insensitively', () => {
    expect(uniqueSku('A-B', ['a-b'])).toBe('A-B-2')
    expect(uniqueSku('A-B', ['A-B', 'A-B-2'])).toBe('A-B-3')
  })
  it('keeps the suffix inside the 40 char limit', () => {
    const base = 'X'.repeat(40)
    expect(uniqueSku(base, [base]).length).toBe(40)
  })
})
