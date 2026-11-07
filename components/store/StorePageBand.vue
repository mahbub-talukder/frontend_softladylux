<script setup lang="ts">
// Banner band used by Contact, Size guide and other plain pages (Contact/SizeGuide boards).
defineProps<{ eyebrow?: string; title: string; blurb?: string }>()
</script>

<template>
  <section class="border-b border-border bg-cream">
    <div class="wrap flex flex-col gap-3.5 py-8 md:py-11">
      <div v-if="eyebrow" class="eyebrow">{{ eyebrow }}</div>
      <h1 class="font-display text-h1 leading-none md:text-h1-lg">{{ title }}</h1>
      <p v-if="blurb" class="max-w-[600px] text-base leading-[1.65] text-body md:text-[17px]">{{ blurb }}</p>
    </div>
  </section>
</template>
