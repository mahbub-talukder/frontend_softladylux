import { describe, expect, it } from 'vitest'
import { firstError, rules as v } from '~/utils/validators'
import type { Rule } from '~/utils/validators'

// SRS §10 / UI-06 rule set.
const run = (r: Rule, x: unknown, all: Record<string, unknown> = {}) => r(x, all)

describe('validators', () => {
  it('required fails on empty, blank and []', () => {
    for (const x of ['', '  ', null, undefined, []]) expect(run(v.required(), x)).toBeTruthy()
    expect(run(v.required(), 0)).toBeNull()
  })
  it('optional rules skip empty values', () => {
    for (const r of [v.maxLength(3), v.email(), v.url(), v.hex(), v.decimal(2), v.min(1), v.phoneBD(), v.slug()]) expect(run(r, '')).toBeNull()
  })
  it('decimal limits places and rejects NaN', () => {
    expect(run(v.decimal(2), '10.99')).toBeNull()
    expect(run(v.decimal(2), '10.999')).toMatch(/2 decimal/)
    expect(run(v.decimal(2), 'abc')).toMatch(/valid number/)
  })
  it('min/max/gt', () => {
    expect(run(v.min(0), '-1')).toBeTruthy()
    expect(run(v.max(100), '101')).toBeTruthy()
    expect(run(v.gt(0), '0')).toBeTruthy()
    expect(run(v.gt(0), '0.01')).toBeNull()
  })
  it('pattern-based: slug, hex, email, url, BD phone', () => {
    expect(run(v.slug(), 'good-slug_2')).toBeNull()
    expect(run(v.slug(), 'Bad Slug')).toBeTruthy()
    expect(run(v.hex(), '#A1b2C3')).toBeNull()
    expect(run(v.hex(), '#abc')).toBeTruthy()
    expect(run(v.email(), 'a@b.co')).toBeNull()
    expect(run(v.email(), 'a@b')).toBeTruthy()
    expect(run(v.url(), 'https://x.com/a')).toBeNull()
    expect(run(v.url(), 'ftp://x.com')).toBeTruthy()
    expect(run(v.phoneBD(), '+8801712345678')).toBeNull()
    expect(run(v.phoneBD(), '01212345678')).toBeTruthy()
  })
  it('length helpers and cross-field custom', () => {
    expect(run(v.between(3, 5), 'ab')).toBeTruthy()
    expect(run(v.between(3, 5), 'abcd')).toBeNull()
    const gtPrice = v.custom((x, all) => (Number(x) > Number(all.price) ? null : 'must be higher'))
    expect(run(gtPrice, '5', { price: '10' })).toBe('must be higher')
    expect(firstError([v.required(), v.maxLength(2)], 'abc', {})).toMatch(/at most 2/)
  })
})
