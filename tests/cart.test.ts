// Covers SRS CRT-01/02/07 (robust browser cart) and scenario 20 (corrupt storage cleared without error).
import { describe, expect, it } from 'vitest'
import { addLine, CART_KEY, clampQty, countItems, MAX_AGE_MS, MAX_LINES, parseCart, removeLine, serializeCart, setQuantity, subtotalOf, type CartLine } from '../utils/cart'

const NOW = 1_800_000_000_000
const line = (variant: number, over: Partial<CartLine> = {}): CartLine => ({
  variant, quantity: 1, addedAt: NOW, name: 'Bra', label: 'Rose / 34B', sku: `SKU-${variant}`, price: '1000', image: null, slug: 'bra', ...over
})

describe('parseCart (CRT-07)', () => {
  it('round-trips a valid cart', () => {
    const s = { v: 1, lines: [line(1, { quantity: 3 })], area: 'inside_dhaka' as const, coupon: 'WELCOME10' }
    expect(parseCart(serializeCart(s), NOW)).toEqual(s)
  })
  it.each([null, undefined, '', 'not json', '{', '123', 'null', '"str"', '{"v":2,"lines":[]}', '{"v":1}', '{"v":1,"lines":"x"}'])('treats %s as an empty cart without throwing', (raw) => {
    expect(parseCart(raw as string, NOW).lines).toEqual([])
  })
  it('migrates the old bare-array format', () => {
    const c = parseCart(JSON.stringify([{ variant: 7, quantity: 2 }]), NOW)
    expect(c.lines).toHaveLength(1)
    expect(c.lines[0]).toMatchObject({ variant: 7, quantity: 2, price: '0' })
  })
  it('drops junk lines and keeps good ones', () => {
    const raw = JSON.stringify({ v: 1, lines: [null, 5, { variant: 'x' }, { variant: -1, quantity: 1 }, { variant: 3, quantity: 'NaN' }, line(9)] })
    expect(parseCart(raw, NOW).lines.map((l) => l.variant)).toEqual([9])
  })
  it('clamps quantity to 1-10 and sanitises the price', () => {
    const c = parseCart(JSON.stringify({ v: 1, lines: [{ ...line(1), quantity: 99, price: '<script>' }, { ...line(2), quantity: -4 }] }), NOW)
    expect(c.lines.map((l) => l.quantity)).toEqual([10, 1])
    expect(c.lines[0].price).toBe('0')
  })
  it('drops lines older than 30 days', () => {
    const c = parseCart(serializeCart({ v: 1, lines: [line(1, { addedAt: NOW - MAX_AGE_MS - 1 }), line(2, { addedAt: NOW - MAX_AGE_MS + 1000 })], area: null, coupon: '' }), NOW)
    expect(c.lines.map((l) => l.variant)).toEqual([2])
  })
  it('caps at 30 lines and removes duplicate variants', () => {
    const many = Array.from({ length: 40 }, (_, i) => line(i + 1))
    expect(parseCart(serializeCart({ v: 1, lines: many, area: null, coupon: '' }), NOW).lines).toHaveLength(MAX_LINES)
    expect(parseCart(serializeCart({ v: 1, lines: [line(1), line(1)], area: null, coupon: '' }), NOW).lines).toHaveLength(1)
  })
  it('ignores an unknown area and over-long coupon', () => {
    const c = parseCart(JSON.stringify({ v: 1, lines: [], area: 'mars', coupon: 'X'.repeat(50) }), NOW)
    expect(c.area).toBeNull()
    expect(c.coupon).toHaveLength(20)
  })
  it('uses a stable storage key', () => expect(CART_KEY).toBe('sll_cart'))
})

describe('line operations (CRT-02)', () => {
  it('adds, merges the same variant, and caps quantity at 10', () => {
    let r = addLine([], line(1), 3)
    expect(r.status).toBe('added')
    r = addLine(r.lines, line(1), 9)
    expect(r.status).toBe('merged')
    expect(r.lines[0].quantity).toBe(10)
  })
  it('refuses the 31st line', () => {
    const full = Array.from({ length: MAX_LINES }, (_, i) => line(i + 1))
    const r = addLine(full, line(999))
    expect(r.status).toBe('full')
    expect(r.lines).toHaveLength(MAX_LINES)
  })
  it('sets, removes and totals', () => {
    let lines = [line(1, { price: '500' }), line(2, { price: '250.50' })]
    lines = setQuantity(lines, 1, 4)
    expect(countItems(lines)).toBe(5)
    expect(subtotalOf(lines)).toBeCloseTo(2250.5)
    expect(removeLine(lines, 1).map((l) => l.variant)).toEqual([2])
    expect(clampQty(0)).toBe(1)
    expect(clampQty(Number.NaN)).toBe(1)
    expect(clampQty(11.7)).toBe(10)
  })
})
