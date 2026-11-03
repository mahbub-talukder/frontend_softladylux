// Covers SRS THM-06 (safe token injection).
import { describe, expect, it } from 'vitest'
import { tokensToCss } from '../utils/theme'

describe('tokensToCss', () => {
  it('builds a :root block from valid tokens', () => {
    expect(tokensToCss({ '--color-primary': '#6B4E43' })).toBe(':root{--color-primary:#6B4E43;}')
  })
  it('drops unsafe names and values', () => {
    expect(tokensToCss({ 'color': '#FFFFFF', '--color-primary': 'red;}body{x:y' })).toBe('')
  })
  it('handles missing tokens', () => {
    expect(tokensToCss(null)).toBe('')
  })
})
