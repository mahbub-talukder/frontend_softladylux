<script setup lang="ts">
// SRS CAT-07: New arrivals.
// SEO copy v1 (docs/seo-copy.md)
useSeoMeta({ title: 'New Arrivals: Latest Lingerie & Nightwear', description: 'The newest bras, panties, lingerie sets and sleepwear at SoftLadyLux, delivered across Bangladesh with cash on delivery.' })
definePageMeta({ layout: 'bleed' })
</script>

<template>
  <StoreShopListing :scope="{ new: true }" title="New arrivals" :crumbs="[{ name: 'Home', to: '/' }, { name: 'New arrivals' }]" />
</template>
