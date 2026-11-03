<script setup lang="ts">
defineProps<{ eyebrow: string; title: string }>()
</script>

<template>
  <div class="mb-6 flex flex-wrap items-end justify-between gap-4">
    <div><div class="cap">{{ eyebrow }}</div><h1 class="text-4xl">{{ title }}</h1></div>
    <div class="flex gap-3"><slot /></div>
  </div>
</template>
