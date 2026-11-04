<script setup lang="ts">
// A product/category/hero image area: the uploaded photo when there is one, otherwise the canvas's
// tinted tile with garment line art. Fixed aspect ratio, so nothing shifts while images load (UI-05).
import { artKind, tileClass } from '~/utils/tiles'

const props = withDefaults(defineProps<{
  src?: string | null; alt?: string; ratio?: string; tileKey?: number | string; category?: string
  width?: number; height?: number; sizes?: string; eager?: boolean; artWidth?: string; tint?: string
}>(), { alt: '', ratio: '3/4', width: 480, height: 640, artWidth: '56%' })
const cls = computed(() => props.tint || tileClass(props.tileKey))
</script>

<template>
  <div class="relative overflow-hidden" :class="cls" :style="{ aspectRatio: ratio }">
    <NuxtImg v-if="src" format="webp" :src="mediaSrc(src)" :alt="alt" :width="width" :height="height" :sizes="sizes" :loading="eager ? 'eager' : 'lazy'" class="absolute inset-0 h-full w-full object-cover" />
    <div v-else class="absolute inset-0 flex items-center justify-center text-gold" aria-hidden="true">
      <div :style="{ width: artWidth }" class="transition-transform duration-[600ms] group-hover:scale-[1.06]"><StoreArt :kind="artKind(category)" /></div>
    </div>
    <slot />
  </div>
</template>
