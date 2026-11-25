import { withoutTrailingSlashPath } from '../../utils/seo'

// SEO: one URL per page. `/shop/panties/` answers with a 301 to `/shop/panties` (query string kept),
// so search engines never see two copies of a page. Only GET/HEAD page requests; the API is routed by nginx.
export default defineEventHandler((event) => {
  if (event.method !== 'GET' && event.method !== 'HEAD') return
  const url = event.path || '/'
  const target = withoutTrailingSlashPath(url)
  if (target !== url) return sendRedirect(event, target, 301)
})
