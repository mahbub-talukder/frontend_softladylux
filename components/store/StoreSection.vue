<script setup lang="ts">
// Home section heading used across the canvas: eyebrow, 46px serif title, optional right-hand action.
defineProps<{ eyebrow: string; title: string; center?: boolean }>()
</script>

<template>
  <div class="mb-8 flex items-end justify-between gap-4 md:mb-10" :class="center ? 'flex-col items-center text-center' : ''">
    <div class="flex flex-col gap-3"><div class="eyebrow">{{ eyebrow }}</div><h2 class="text-[34px] leading-[1.1] md:text-[46px]">{{ title }}</h2></div>
    <slot />
  </div>
</template>
