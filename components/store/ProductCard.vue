<script setup lang="ts">
// Design: ProductCard board. SRS CAT-05 (discount badge, compare-at struck through), CAT-13
// (sold out), UI-05 (explicit image size). Quick Add and the wishlist heart arrive with M3/M4.
import type { CardProduct } from '~/types/api'

const props = defineProps<{ product: CardProduct }>()
const p = computed(() => props.product)
</script>

<template>
  <article class="group flex flex-col">
    <NuxtLink :to="`/product/${p.slug}`" class="relative block bg-cream" :aria-label="p.name">
      <NuxtImg v-if="p.image" :src="mediaSrc(p.image.url)" :alt="p.image.alt_text || p.name" width="480" height="640" sizes="(min-width: 1024px) 25vw, 50vw" loading="lazy" class="aspect-[3/4] w-full object-cover" />
      <div v-else class="aspect-[3/4] w-full" />
      <div class="absolute left-2 top-2 flex flex-col items-start gap-1">
        <span v-if="p.tag" class="bg-primary px-2 py-0.5 text-[11px] uppercase tracking-widest text-primary-contrast">{{ p.tag }}</span>
        <span v-if="p.discount_pct" class="bg-accent px-2 py-0.5 text-[12px] font-semibold text-primary-contrast">−{{ p.discount_pct }}%</span>
      </div>
      <div v-if="p.sold_out" class="absolute inset-x-0 bottom-0 bg-surface/90 py-1 text-center text-xs uppercase tracking-widest">Sold out</div>
    </NuxtLink>
    <div class="mt-3 flex flex-col gap-1">
      <NuxtLink :to="`/product/${p.slug}`" class="font-display text-lg leading-tight">{{ p.name }}</NuxtLink>
      <div class="text-sm text-muted">{{ p.subcategory?.name || p.category.name }}</div>
      <div class="flex items-baseline gap-2 text-sm">
        <span class="font-medium">{{ taka(p.price) }}</span>
        <s v-if="p.discount_pct" class="text-muted">{{ taka(p.compare_at_price) }}</s>
      </div>
      <div v-if="p.colors.length > 1" class="flex gap-1" aria-label="Available colours">
        <span v-for="c in p.colors.slice(0, 5)" :key="c.name" :title="c.name" class="h-3 w-3 border border-border" :style="{ backgroundColor: c.hex }" />
      </div>
    </div>
  </article>
</template>
