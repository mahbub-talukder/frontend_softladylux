// Covers SRS v1.11 CHK-11 (client side of the guest OTP step: the number sent to /checkout/otp/ is the
// normalised 01XXXXXXXXX form, resend gap 60 s) and CHK-12 (payment logos ship as valid static files).
import { describe, expect, it } from 'vitest'
import bkashSvg from '../public/payments/bkash.svg?raw'
import { normalizePhone, RESEND_SECONDS, secondsLeft } from '../utils/otp'

describe('checkout OTP phone (CHK-11)', () => {
  it.each([
    ['01712345678', '01712345678'],
    ['+8801712345678', '01712345678'],
    ['8801712345678', '01712345678'],
    ['017 1234-5678', '01712345678'],
    ['(017)12345678', '01712345678']
  ])('normalises %s', (raw, out) => expect(normalizePhone(raw)).toBe(out))
  it.each(['', '0171234567', '01212345678', '1712345678', 'abc'])('rejects %s (server reports the error, no SMS)', (raw) => expect(normalizePhone(raw)).toBeNull())
  it('resend waits 60 s', () => {
    expect(RESEND_SECONDS).toBe(60)
    expect(secondsLeft(1_000, 1_000)).toBe(60)
    expect(secondsLeft(1_000, 61_000)).toBe(0)
  })
})

describe('payment logos (CHK-12)', () => {
  // Vite reads the files, so this needs no Node file APIs (same approach as tracking.test.ts).
  it('bKash mark is a standalone SVG with a viewBox and no scripts', () => {
    const svg = bkashSvg as string
    expect(svg.trim().startsWith('<svg')).toBe(true)
    expect(svg).toMatch(/viewBox="0 0 [\d.]+ [\d.]+"/)
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"')
    expect(svg).not.toMatch(/<script|on\w+=/i)
    expect(svg.match(/<path/g)?.length).toBeGreaterThan(5)
  })
  it('Nagad mark ships with the site', () => {
    const files = Object.keys(import.meta.glob('../public/payments/*.png', { query: '?url', import: 'default' }))
    expect(files).toContain('../public/payments/nagad.png')
  })
})
