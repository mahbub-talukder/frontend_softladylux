// SRS v1.7 CAT-25 (blank variant weight = product weight) and CAT-26 (weight display).
import { describe, expect, it } from 'vitest'
import { formatWeight, variantWeightPayload } from '~/utils/weight'

describe('variantWeightPayload', () => {
  it('sends blank as null so the variant uses the product weight', () => {
    expect(variantWeightPayload('')).toBeNull()
    expect(variantWeightPayload(null)).toBeNull()
    expect(variantWeightPayload(undefined)).toBeNull()
  })
  it('sends a number for an override', () => {
    expect(variantWeightPayload('250')).toBe(250)
    expect(variantWeightPayload(180)).toBe(180)
  })
})

describe('formatWeight', () => {
  it('shows grams below 1 kg and kilograms above', () => {
    expect(formatWeight(450)).toBe('450 g')
    expect(formatWeight(1000)).toBe('1 kg')
    expect(formatWeight(1250)).toBe('1.25 kg')
    expect(formatWeight(undefined)).toBe('—')
  })
})
