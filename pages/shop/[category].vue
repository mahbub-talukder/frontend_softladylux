<script setup lang="ts">
import { categoryTitle } from '~/utils/seo'
// SRS STF /shop/:category (optional ?sub=slug1,slug2), CAT-09, CAT-20, CAT-22.
const route = useRoute()
const slug = computed(() => String(route.params.category))
const { data: cats } = await useCategories()
const cat = computed(() => cats.value?.find((c) => c.slug === slug.value))
if (!cat.value) throw createError({ statusCode: 404, statusMessage: 'Category not found' })
// SEO copy v1 (docs/seo-copy.md): "Bras Online in Bangladesh | SoftLadyLux"; the category's admin SEO fields win.
useSeoMeta({ title: () => (cat.value ? categoryTitle(cat.value) : ''), description: () => cat.value?.seo_description || cat.value?.description, ogTitle: () => (cat.value ? categoryTitle(cat.value) : '') })
definePageMeta({ layout: 'bleed' })
</script>

<template>
  <StoreShopListing :key="slug" :scope="{ category: slug }" :title="cat!.name" :blurb="cat!.description" :crumbs="[{ name: 'Home', to: '/' }, { name: cat!.name }]" />
</template>
