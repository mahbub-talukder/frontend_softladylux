declare const process: { env: Record<string, string | undefined> } // build-time env (no @types/node dependency)
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: false },
  modules: ['@pinia/nuxt', '@nuxtjs/tailwindcss', '@nuxt/image'],
  css: ['~/assets/css/tokens.css', '~/assets/css/main.css'],
  typescript: { strict: true },
  runtimeConfig: {
    // Server-side (SSR) base URL of the Django API inside Docker.
    apiBaseInternal: 'http://localhost:8000/api/v1',
    public: {
      // Browser-side base URL (same origin behind nginx).
      apiBase: '/api/v1',
      // Public origin for sitemap, canonical and structured data (NUXT_PUBLIC_SITE_URL). Empty = use the request host.
      siteUrl: ''
    }
  },
  // SRS ARC-03: storefront SSR for SEO, admin client-rendered.
  routeRules: {
    '/admin/**': { ssr: false } // admin is client-rendered (ARC-03); /_nuxt caching is set by nginx
  },
  // SRS ARC-07 / SD-02: request-time WebP resizing by Nuxt Image.
  // Originals live in the shared media volume; NUXT_IMAGE_DIR points IPX at it (mounted at /media in Docker).
  image: { format: ['webp'], dir: process.env.NUXT_IMAGE_DIR || 'public' },
  app: {
    head: {
      htmlAttrs: { lang: 'en' }, title: 'SoftLadyLux',
      // Storefront favicon (the logo icon on an ivory disc). The admin layouts replace these four links with the dark tile
      // (same keys); a favicon uploaded in Settings replaces the 'favicon' one on the storefront.
      link: [
        { key: 'favicon', rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { key: 'favicon-png', rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32.png' },
        { key: 'favicon-ico', rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { key: 'apple-icon', rel: 'apple-touch-icon', href: '/apple-touch-icon.png' }
      ]
    },
    pageTransition: { name: 'page', mode: 'out-in' }
  }
})
