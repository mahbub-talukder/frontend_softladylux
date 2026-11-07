// SRS WEB-09 / §10: client-side mirror of the upload rules so a bad photo is explained at selection time
// (the server still validates). JPG/PNG/WebP, max 5 MB, product photos at least PRODUCT_MIN_SIDE px on the long side.

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
export const PRODUCT_MIN_SIDE = 300
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']

export interface ImageMeta { type: string; size: number; width: number; height: number; name?: string }

/** Pure rule check. Returns an error message, or '' when the file is acceptable. */
export function checkImageMeta(m: ImageMeta, opts: { minSide?: number } = {}): string {
  if (!IMAGE_TYPES.includes(m.type)) return 'Only JPG, PNG or WebP images are allowed.'
  if (m.size > MAX_IMAGE_BYTES) return `Image must be 5 MB or smaller (this one is ${(m.size / 1048576).toFixed(1)} MB).`
  if (!m.width || !m.height) return 'This file could not be read as an image.'
  const min = opts.minSide ?? 0
  if (min && Math.max(m.width, m.height) < min) return `Photos must be at least ${min} px on the long side (this one is ${m.width}×${m.height}).`
  return ''
}

/** Natural size of an image file in the browser, or null when it can't be decoded. */
export function readImageSize(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => { resolve({ width: img.naturalWidth, height: img.naturalHeight }); URL.revokeObjectURL(url) }
    img.onerror = () => { resolve(null); URL.revokeObjectURL(url) }
    img.src = url
  })
}

/** Full check of a File in the browser (type, size, decodable, minimum long side). */
export async function checkImageFile(file: File, opts: { minSide?: number } = {}): Promise<string> {
  const early = checkImageMeta({ type: file.type, size: file.size, width: 1, height: 1 }, {})
  if (early) return early
  const dims = await readImageSize(file)
  return checkImageMeta({ type: file.type, size: file.size, width: dims?.width ?? 0, height: dims?.height ?? 0 }, opts)
}
