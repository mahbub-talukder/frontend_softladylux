import { describe, expect, it } from 'vitest'
import { parseVideo } from '~/utils/video'

describe('parseVideo', () => {
  it.each([
    'https://www.youtube.com/watch?v=xvRq3WANjPg',
    'https://youtu.be/xvRq3WANjPg?t=5',
    'https://m.youtube.com/watch?v=xvRq3WANjPg&feature=share',
    'https://www.youtube.com/shorts/xvRq3WANjPg',
    'https://www.youtube.com/embed/xvRq3WANjPg',
    'https://www.youtube.com/live/xvRq3WANjPg?si=abc'
  ])('finds the YouTube id in %s', (url) => {
    const v = parseVideo(url)
    expect(v.kind).toBe('youtube')
    expect(v.id).toBe('xvRq3WANjPg')
    expect(v.embed).toContain('youtube-nocookie.com/embed/xvRq3WANjPg')
    expect(v.thumbs[0]).toContain('/vi/xvRq3WANjPg/maxresdefault.jpg')
    expect(v.thumbs).toHaveLength(2)
  })
  it('handles Vimeo and direct files', () => {
    expect(parseVideo('https://vimeo.com/123456789')).toMatchObject({ kind: 'vimeo', id: '123456789' })
    expect(parseVideo('https://cdn.example.com/a/b.MP4')).toMatchObject({ kind: 'file' })
  })
  it('does not embed anything it does not recognise', () => {
    expect(parseVideo('https://www.facebook.com/x/videos/1').kind).toBe('other')
    expect(parseVideo('https://www.youtube.com/watch?v=short').kind).toBe('other')
    expect(parseVideo('javascript:alert(1)').kind).toBe('other')
    expect(parseVideo('').kind).toBe('other')
    expect(parseVideo(null).kind).toBe('other')
  })
})
