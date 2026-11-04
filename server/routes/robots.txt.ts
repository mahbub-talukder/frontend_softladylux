import { buildRobots, siteOrigin } from '../../utils/seo'

// SRS §9 SEO: robots.txt with the admin and private pages disallowed.
export default defineEventHandler((event) => {
  const cfg = useRuntimeConfig(event)
  setHeader(event, 'content-type', 'text/plain; charset=utf-8')
  setHeader(event, 'cache-control', 'public, max-age=3600')
  const origin = siteOrigin(cfg.public.siteUrl as string, getRequestHost(event, { xForwardedHost: true }), getRequestProtocol(event, { xForwardedProto: true }))
  return buildRobots(origin)
})
