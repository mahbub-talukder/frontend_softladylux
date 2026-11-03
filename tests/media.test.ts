import { describe, expect, it } from 'vitest'
import { mediaSrc } from '../utils/media'

describe('mediaSrc (WEB-09)', () => {
  it('strips the /media prefix for IPX', () => {
    expect(mediaSrc('/media/uploads/2026/11/a.png')).toBe('/uploads/2026/11/a.png')
  })
  it('handles empty', () => {
    expect(mediaSrc(null)).toBe('')
  })
})
