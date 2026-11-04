// Covers the placeholder tile mapping (design: tinted tile + garment line art).
import { describe, expect, it } from 'vitest'
import { artKind, tileClass, TILES } from '../utils/tiles'

describe('artKind', () => {
  it('maps the eight categories to the canvas drawings', () => {
    expect(['bras', 'panties', 'lingerie-sets', 'shapewear', 'sleepwear', 'tops', 'accessories', 'gift-sets'].map(artKind))
      .toEqual(['bra', 'brief', 'set', 'shape', 'gown', 'top', 'acc', 'gift'])
  })
  it('is stable for unknown or missing categories', () => {
    expect(artKind('hosiery')).toBe(artKind('hosiery'))
    expect(artKind(undefined)).toBe('top')
  })
})

describe('tileClass', () => {
  it('cycles the eight tints and is stable', () => {
    expect(tileClass(1)).toBe(tileClass(1))
    expect(new Set([0, 1, 2, 3, 4, 5, 6, 7].map(tileClass)).size).toBe(8)
    expect(tileClass(8)).toBe(tileClass(0))
    expect(TILES).toHaveLength(8)
  })
  it('accepts strings and empty keys without throwing', () => {
    expect(tileClass('bras')).toMatch(/^bg-tile-[1-8]$/)
    expect(tileClass(undefined)).toMatch(/^bg-tile-[1-8]$/)
  })
})
