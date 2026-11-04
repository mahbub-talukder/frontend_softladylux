<script setup lang="ts">
// Storefront layout: header + footer read from the Settings API (SET-08).
const { data: s } = await useSiteSettings()
useHead({
  link: () => (s.value?.favicon ? [{ rel: 'icon', href: s.value.favicon.url }] : [])
})
</script>

<template>
  <div class="min-h-screen bg-bg text-ink">
    <StoreHeader />
    <main class="mx-auto max-w-screen-xl px-4 py-8 pb-24 sm:pb-8"><slot /></main>
    <StoreFooter />
    <StoreBottomNav />
  </div>
</template>
