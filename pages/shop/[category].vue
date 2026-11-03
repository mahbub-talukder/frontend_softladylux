<script setup lang="ts">
// SRS STF /shop/:category (optional ?sub=slug1,slug2), CAT-09, CAT-20, CAT-22.
const route = useRoute()
const slug = computed(() => String(route.params.category))
const { data: cats } = await useCategories()
const cat = computed(() => cats.value?.find((c) => c.slug === slug.value))
if (!cat.value) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
useSeoMeta({ title: () => cat.value?.name, description: () => cat.value?.description })
</script>

<template>
  <ShopListing :key="slug" :scope="{ category: slug }" :title="cat!.name" :blurb="cat!.description" :crumbs="[{ name: 'Home', to: '/' }, { name: cat!.name }]" />
</template>
