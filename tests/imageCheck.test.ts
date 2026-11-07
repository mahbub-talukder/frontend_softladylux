import { describe, expect, it } from 'vitest'
import { checkImageMeta } from '~/utils/imageCheck'

// SRS WEB-09 / §10 (min side lowered 600 -> 300 by owner approval).
describe('checkImageMeta', () => {
  const ok = { type: 'image/jpeg', size: 1000, width: 900, height: 1200 }
  it('accepts a normal photo', () => expect(checkImageMeta(ok, { minSide: 300 })).toBe(''))
  it('rejects other formats', () => expect(checkImageMeta({ ...ok, type: 'image/gif' })).toMatch(/JPG, PNG or WebP/))
  it('rejects files over 5 MB with the size shown', () => expect(checkImageMeta({ ...ok, size: 6 * 1048576 })).toMatch(/5 MB or smaller.*6\.0 MB/))
  it('rejects unreadable images', () => expect(checkImageMeta({ ...ok, width: 0, height: 0 })).toMatch(/could not be read/))
  it('enforces the minimum long side only when asked', () => {
    const small = { ...ok, width: 128, height: 170 }
    expect(checkImageMeta(small, { minSide: 300 })).toMatch(/at least 300 px.*128×170/)
    expect(checkImageMeta(small)).toBe('')
    expect(checkImageMeta({ ...ok, width: 300, height: 200 }, { minSide: 300 })).toBe('')
  })
})
