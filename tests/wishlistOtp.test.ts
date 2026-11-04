// Covers SRS ACC-01 (OTP timing/format), ACC-07 (guest wishlist merge), ACC-12/14 (client checks).
import { describe, expect, it } from 'vitest'
import { mergeIds, parseWishlist, toggleId, MAX_ITEMS } from '../utils/wishlist'
import { cleanCode, isCode, normalizePhone, passwordProblem, secondsLeft } from '../utils/otp'

describe('guest wishlist', () => {
  it.each([null, '', 'x', '{', '{"a":1}', '"s"'])('never throws on %s', (raw) => expect(parseWishlist(raw as string)).toEqual([]))
  it('keeps unique positive integers only', () => expect(parseWishlist('[3,"4",3,-1,0,2.5,"x",null,9]')).toEqual([3, 4, 9]))
  it('caps the list', () => expect(parseWishlist(JSON.stringify(Array.from({ length: 300 }, (_, i) => i + 1)))).toHaveLength(MAX_ITEMS))
  it('toggles newest first and merges without duplicates', () => {
    expect(toggleId([1, 2], 3)).toEqual([3, 1, 2])
    expect(toggleId([1, 2], 1)).toEqual([2])
    expect(mergeIds([1, 2], [2, 3])).toEqual([1, 2, 3])
  })
})

describe('otp helpers', () => {
  it('validates and cleans a 6-digit code', () => {
    expect(isCode('123456')).toBe(true)
    expect(isCode('12345')).toBe(false)
    expect(isCode('12345a')).toBe(false)
    expect(cleanCode(' 12-34 56 78')).toBe('123456')
  })
  it('counts down the 60 second resend gap', () => {
    expect(secondsLeft(0, 0)).toBe(60)
    expect(secondsLeft(0, 59_100)).toBe(1)
    expect(secondsLeft(0, 61_000)).toBe(0)
  })
  it('checks passwords (ACC-12) and mobiles (ACC-14)', () => {
    expect(passwordProblem('short', '01712345678')).toMatch(/8 characters/)
    expect(passwordProblem('01712345678', '01712345678')).toMatch(/mobile/)
    expect(passwordProblem('long-enough-1', '01712345678')).toBe('')
    expect(normalizePhone('+8801712345678')).toBe('01712345678')
    expect(normalizePhone('880 1712-345678')).toBe('01712345678')
    expect(normalizePhone('01212345678')).toBeNull()
    expect(normalizePhone('123')).toBeNull()
  })
})
