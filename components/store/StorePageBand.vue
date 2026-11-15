<script setup lang="ts">
// Banner band used by Contact, Size guide and other plain pages (Contact/SizeGuide boards).
defineProps<{ eyebrow?: string; title: string; blurb?: string; compact?: boolean }>()
</script>

<template>
  <section class="border-b border-border bg-cream">
    <div class="wrap flex flex-col" :class="compact ? 'gap-2 py-5 md:py-7' : 'gap-3.5 py-8 md:py-11'">
      <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
      <h1 class="font-display leading-none" :class="compact ? 'text-h2 md:text-h1' : 'text-h1 md:text-h1-lg'">{{ title }}</h1>
      <p v-if="blurb" class="max-w-[600px] leading-[1.65] text-body" :class="compact ? 'text-[15px]' : 'text-base md:text-[17px]'">{{ blurb }}</p>
    </div>
  </section>
</template>
