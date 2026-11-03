// Covers SRS CAT-09 / CAT-20 (URL state), scenario 13/23 (filters survive reload).
import { describe, expect, it } from 'vitest'
import { chips, emptyFilters, parseQuery, toApiParams, toggleIn, toQuery } from '../utils/listingQuery'

describe('parseQuery / toQuery', () => {
  it('round-trips the sub-category filter from the URL', () => {
    const f = parseQuery({ sub: 'air-bra,tube-bra', sort: 'price_asc', price_max: '2000', available: '1' })
    expect(f.sub).toEqual(['air-bra', 'tube-bra'])
    expect(toQuery(f)).toEqual({ sub: 'air-bra,tube-bra', sort: 'price_asc', price_max: '2000', available: '1' })
  })
  it('omits defaults', () => {
    expect(toQuery(emptyFilters())).toEqual({})
  })
  it('ignores junk', () => {
    const f = parseQuery({ sort: 'nope', price_max: 'abc', sub: ',,a,' })
    expect(f.sort).toBe('featured')
    expect(f.priceMax).toBeNull()
    expect(f.sub).toEqual(['a'])
  })
})

describe('toApiParams', () => {
  it('scopes a category page and paginates', () => {
    const f = parseQuery({ sub: 'air-bra', category: 'panties' })
    const p = toApiParams(f, { category: 'bras' }, 2, 12)
    expect(p).toMatchObject({ category: 'bras', sub: 'air-bra', page: '2', page_size: '12' })
  })
  it('offers and new scopes', () => {
    expect(toApiParams(emptyFilters(), { offers: true }).offers).toBe('1')
    expect(toApiParams(emptyFilters(), { new: true }).new).toBe('1')
  })
})

describe('toggleIn / chips', () => {
  it('toggles values', () => {
    expect(toggleIn(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleIn(['a', 'b'], 'a')).toEqual(['b'])
  })
  it('lists removable chips', () => {
    const f = parseQuery({ sub: 'air-bra', size: '34B', price_max: '1500' })
    expect(chips(f).map((c) => c.label)).toEqual(['air-bra', '34B', 'Up to ৳ 1500'])
  })
})
