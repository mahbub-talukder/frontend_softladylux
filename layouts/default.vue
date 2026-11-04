<script setup lang="ts">
import { canonicalOf, siteOrigin } from '~/utils/seo'

// Storefront layout: header + footer read from the Settings API (SET-08).
const { data: s } = await useSiteSettings()
const url = useRequestURL()
const route = useRoute()
// Read once in setup: composables like useRuntimeConfig() must not run lazily inside computed().
const origin = siteOrigin(useRuntimeConfig().public.siteUrl as string, url.host, url.protocol.replace(':', ''))
useHead({
  link: () => [...(s.value?.favicon ? [{ rel: 'icon', href: s.value.favicon.url }] : []), { rel: 'canonical', href: canonicalOf(origin, route.path) }]
})
// Open Graph defaults from Settings (SET-04); pages override title/description/image.
useSeoMeta({
  ogSiteName: () => s.value?.company_name, ogType: 'website', twitterCard: 'summary_large_image',
  ogImage: () => (s.value?.seo_share_image ? origin + s.value.seo_share_image.url : undefined),
  description: () => s.value?.seo_description || s.value?.tagline || undefined, ogDescription: () => s.value?.seo_description || undefined
})
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <a href="#main" class="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-surface focus:p-3">Skip to content</a>
    <StoreHeader />
    <main id="main" tabindex="-1" class="mx-auto max-w-screen-xl px-4 py-8 pb-24 sm:pb-8"><slot /></main>
    <StoreFooter />
    <StoreBottomNav />
    <StoreCookieBanner />
  </div>
</template>
