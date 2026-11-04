<script setup lang="ts">
// SRS CAT-10 / STF /search?q=
const route = useRoute()
const q = computed(() => String(route.query.q ?? ''))
useSeoMeta({ title: () => (q.value ? `Search: ${q.value}` : 'Search'), robots: 'noindex' })
definePageMeta({ layout: 'bleed' })
</script>

<template>
  <StoreShopListing :key="q" :scope="{}" :title="q ? `Results for “${q}”` : 'Search'" :crumbs="[{ name: 'Home', to: '/' }, { name: 'Search' }]" />
</template>
