// Covers M6 error pages: the branded error page exists, uses tokens only (no hex), shows no stack
// trace, and is noindex. (Rendering is checked on the production build in the release run.)
import { describe, expect, it } from 'vitest'
import src from '../error.vue?raw'

describe('error.vue', () => {
  it('handles 404 and generic errors with plain wording', () => {
    expect(src).toContain('We can’t find that page')
    expect(src).toContain('Something went wrong')
  })
  it('never prints error details or a stack trace', () => {
    expect(src).not.toMatch(/error\.(stack|message|statusMessage)/)
    expect(src).not.toContain('stack')
  })
  it('is noindex, offers search on 404 and a way back (admin gets its own)', () => {
    expect(src).toContain("content: 'noindex'")
    expect(src).toContain('/search?q=')
    expect(src).toContain("'/admin'")
  })
  it('uses theme tokens only', () => {
    expect(src).not.toMatch(/#[0-9a-fA-F]{3,8}\b/)
    expect(src).not.toMatch(/\brgba?\(/)
  })
})
