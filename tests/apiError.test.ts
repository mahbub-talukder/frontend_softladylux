import { describe, expect, it } from 'vitest'
import { humanizeKey, normalizeApiError, normalizeFields } from '~/utils/apiError'

// SRS §7 error shape + UI-06: errors are always shown as readable text, never per-letter or [object Object].
describe('normalizeFields', () => {
  it('wraps plain strings into arrays (not iterated per character)', () => {
    expect(normalizeFields({ is_active: 'Add at least one image before publishing.' })).toEqual({
      is_active: ['Add at least one image before publishing.']
    })
  })
  it('keeps list-of-strings', () => {
    expect(normalizeFields({ price: ['A valid number is required.'] })).toEqual({ price: ['A valid number is required.'] })
  })
  it('flattens nested variant errors into row-indexed keys and a parent roll-up', () => {
    const f = normalizeFields({ variants: [{}, { sku: ['SKU X is taken.'] }] })
    expect(f['variants[1].sku']).toEqual(['SKU X is taken.'])
    expect(f.variants).toEqual(['Variants, row 2: sku: SKU X is taken.'])
  })
  it('ignores empty/null entries', () => {
    expect(normalizeFields({ a: [], b: null, c: [{}] })).toEqual({})
  })
})

describe('humanizeKey', () => {
  it('formats plain and nested keys', () => {
    expect(humanizeKey('compare_at_price')).toBe('Compare at price')
    expect(humanizeKey('variants[1].sku')).toBe('Variants, row 2: sku')
  })
})

describe('normalizeApiError', () => {
  it('uses the backend body', () => {
    const e = normalizeApiError({ statusCode: 400, data: { code: 'validation_error', message: 'Please correct the highlighted fields.', fields: { price: ['Too low.'] } } })
    expect(e.code).toBe('validation_error')
    expect(e.fields.price).toEqual(['Too low.'])
    expect(e.flat).toEqual(['Price: Too low.'])
    expect(e.status).toBe(400)
  })
  it('puts non-field text in flat unchanged', () => {
    const e = normalizeApiError({ statusCode: 409, data: { code: 'conflict', message: 'Order already shipped.', fields: {} } })
    expect(e.flat).toEqual(['Order already shipped.'])
  })
  it('does not repeat parent roll-ups next to their rows', () => {
    const e = normalizeApiError({ statusCode: 400, data: { fields: { variants: [{ sku: ['Taken.'] }] } } })
    expect(e.flat).toEqual(['Variants, row 1: sku: Taken.'])
  })
  it('maps HTML 500 / 413 / network failures to clear messages', () => {
    expect(normalizeApiError({ statusCode: 500 }).message).toMatch(/server had a problem/i)
    expect(normalizeApiError({ statusCode: 413 }).message).toMatch(/too large/i)
    expect(normalizeApiError(new Error('Failed to fetch')).message).toMatch(/reach the server/i)
  })
  it('reads DRF detail errors', () => {
    expect(normalizeApiError({ statusCode: 403, data: { detail: 'CSRF Failed.' } }).message).toBe('CSRF Failed.')
  })
})
