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
  it('accepts digit-suffixed tokens and tile tokens the server derives', () => {
    expect(tokensToCss({ '--color-text-dark-2': '#BFB3A5', '--tile-3': '#E9DCCB' })).toBe(':root{--color-text-dark-2:#BFB3A5;--tile-3:#E9DCCB;}')
  })
  it('still rejects unknown prefixes', () => {
    expect(tokensToCss({ '--tile-9x': '#E9DCCB', '--other': '#E9DCCB' })).toBe('')
  })
})
