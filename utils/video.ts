// Video links from Admin → Website → Videos (SRS WEB-07). Works out how to play a pasted URL in place and which
// thumbnail to show when the owner did not upload one. Pure functions, unit-tested.
export type VideoKind = 'youtube' | 'vimeo' | 'file' | 'other'
export interface ParsedVideo { kind: VideoKind; id?: string; embed?: string; thumbs: string[] }

const YT_ID = /^[\w-]{11}$/

function youtubeId(u: URL): string | null {
  const host = u.hostname.replace(/^www\.|^m\./, '')
  if (host === 'youtu.be') { const id = u.pathname.slice(1).split('/')[0] ?? ''; return YT_ID.test(id) ? id : null }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com' || host === 'music.youtube.com') {
    const v = u.searchParams.get('v')
    if (v && YT_ID.test(v)) return v
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]{11})/)
    if (m) return m[1] ?? null
  }
  return null
}

export function parseVideo(raw: string | null | undefined): ParsedVideo {
  let u: URL
  try { u = new URL((raw ?? '').trim()) } catch { return { kind: 'other', thumbs: [] } }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return { kind: 'other', thumbs: [] }
  const yt = youtubeId(u)
  if (yt) {
    // youtube-nocookie: no tracking cookies until the visitor presses play. maxres is sharpest but not every video has it,
    // so the gallery steps down the list when an image fails to load.
    return {
      kind: 'youtube', id: yt,
      embed: `https://www.youtube-nocookie.com/embed/${yt}?autoplay=1&rel=0&modestbranding=1&playsinline=1`,
      thumbs: [`https://i.ytimg.com/vi/${yt}/maxresdefault.jpg`, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`]
    }
  }
  if (u.hostname.replace(/^www\./, '') === 'vimeo.com') {
    const id = u.pathname.match(/\/(\d{5,})/)?.[1]
    if (id) return { kind: 'vimeo', id, embed: `https://player.vimeo.com/video/${id}?autoplay=1&dnt=1`, thumbs: [] }
  }
  if (/\.(mp4|webm|ogg)$/i.test(u.pathname)) return { kind: 'file', embed: u.toString(), thumbs: [] }
  return { kind: 'other', thumbs: [] }
}
