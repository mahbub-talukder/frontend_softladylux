<script setup lang="ts">
// SRS CAT-06: Offers is a virtual view (compare-at above price, or flagged as an offer).
useSeoMeta({ title: 'Offers' })
</script>

<template>
  <StoreShopListing :scope="{ offers: true }" title="Offers" blurb="Discounted pieces and favourites." :crumbs="[{ name: 'Home', to: '/' }, { name: 'Offers' }]" />
</template>
