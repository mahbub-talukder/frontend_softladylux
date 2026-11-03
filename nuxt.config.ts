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
      apiBase: '/api/v1'
    }
  },
  // SRS ARC-03: storefront SSR for SEO, admin client-rendered.
  routeRules: {
    '/admin/**': { ssr: false } // admin is client-rendered (ARC-03)
  },
  // SRS ARC-07 / SD-02: request-time WebP resizing by Nuxt Image.
  image: { format: ['webp'] },
  app: {
    head: { htmlAttrs: { lang: 'en' }, title: 'SoftLadyLux' }
  }
})
