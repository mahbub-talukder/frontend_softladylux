<script setup lang="ts">
// SRS CAT-06: Offers is a virtual view (compare-at above price, or flagged as an offer).
// SEO copy v1 (docs/seo-copy.md)
useSeoMeta({ title: 'Lingerie Offers & Discounts in Bangladesh', description: 'Current deals on bras, panties and lingerie sets at SoftLadyLux. Limited-time prices, cash on delivery all over Bangladesh.' })
definePageMeta({ layout: 'bleed' })
</script>

<template>
  <StoreShopListing :scope="{ offers: true }" title="Offers" blurb="Discounted pieces and favourites." :crumbs="[{ name: 'Home', to: '/' }, { name: 'Offers' }]" />
</template>
