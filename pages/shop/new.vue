<script setup lang="ts">
// SRS CAT-07: New arrivals.
useSeoMeta({ title: 'New arrivals' })
</script>

<template>
  <ShopListing :scope="{ new: true }" title="New arrivals" :crumbs="[{ name: 'Home', to: '/' }, { name: 'New arrivals' }]" />
</template>
