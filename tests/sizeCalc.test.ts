// Covers SRS CAT-08 (calculator reads the chart; defaults from the SizeGuide board).
import { describe, expect, it } from 'vitest'
import { apparelSize, braSize } from '../utils/sizeCalc'
import { taka } from '../utils/money'

const bra = { bands: [], cups: [{ cup: 'A', min: 11, max: 13 }, { cup: 'B', min: 14, max: 16 }, { cup: 'C', min: 17, max: 19 }, { cup: 'D', min: 20, max: 22 }, { cup: 'DD', min: 23, max: 25 }] }
const apparel = { rows: [
  { size: 'S', bust: [80, 86], waist: [62, 68], hip: [88, 94] }, { size: 'M', bust: [86, 92], waist: [68, 74], hip: [94, 100] },
  { size: 'L', bust: [92, 98], waist: [74, 80], hip: [100, 106] }, { size: 'XL', bust: [98, 104], waist: [80, 86], hip: [106, 112] }] }

describe('braSize', () => {
  it('follows the board formula (80 cm under bust = band 32, 14 cm difference = cup B)', () => {
    expect(braSize(bra, 80, 94)).toEqual({ band: 32, cup: 'B', label: '32B' })
  })
  it('rejects bust <= under bust', () => {
    expect(braSize(bra, 80, 80)).toBeNull()
  })
  it('clamps the band and falls back to DDD', () => {
    expect(braSize(bra, 200, 240)?.band).toBe(44)
    expect(braSize(bra, 80, 120)?.cup).toBe('DDD')
  })
  it('follows edited thresholds', () => {
    const edited = { ...bra, cups: [{ cup: 'AA', min: 0, max: 20 }] }
    expect(braSize(edited, 80, 94)?.cup).toBe('AA')
  })
})

describe('apparelSize / taka', () => {
  it('picks by hip', () => {
    expect(apparelSize(apparel, 98)).toBe('M')
    expect(apparelSize(apparel, 140)).toBe('XXL')
  })
  it('formats BDT', () => {
    expect(taka('2450.00')).toBe('৳ 2,450')
  })
})
