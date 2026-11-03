// SRS WEB-09 / SD-02: the API returns the stored original as /media/...; Nuxt Image resizes it
// from the mounted media directory (NUXT_IMAGE_DIR), so the image path is relative to that dir.
export function mediaSrc(url: string | null | undefined): string {
  return url ? url.replace(/^\/media/, '') : ''
}
