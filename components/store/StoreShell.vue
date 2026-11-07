<script setup lang="ts">
import { canonicalOf, siteOrigin } from '~/utils/seo'
defineProps<{ bleed?: boolean }>()

// Storefront shell: header + footer read from the Settings API (SET-08). `bleed` pages (home) run
// edge to edge and place their own 1320px containers; all others sit in one (DesignSystem grid).
const { data: s } = await useSiteSettings()
const url = useRequestURL()
const route = useRoute()
const sizeFinder = useSizeFinder()
// A page change closes the dialog (e.g. "Shop in 32B" from inside it).
watch(() => route.fullPath, () => sizeFinder.hide())
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
    <main id="main" tabindex="-1" class="pb-20 outline-none sm:pb-0" :class="bleed ? '' : 'wrap py-6 md:py-9'"><slot /></main>
    <StoreFooter />
    <ClientOnly><StoreFloatingCart /></ClientOnly> <!-- cart lives in localStorage: client-only avoids a hydration mismatch -->
    <StoreBottomNav />
    <StoreCookieBanner />
    <StoreSizeModal v-if="sizeFinder.open.value" @close="sizeFinder.hide()" />
  </div>
</template>
