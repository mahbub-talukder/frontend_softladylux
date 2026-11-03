<script setup lang="ts">
// Design: Header board (M1 part). SRS STF header: announcement bar, logo, Find My Size, Track Order.
// Search, wishlist, account, bag and the category bar arrive with M2-M4. There is no contact bar
// and no floating chat button (SD decisions).
const { data: s } = await useSiteSettings()
const { data: home } = await useHome()
const note = computed(() => home.value?.announcements?.[0])
</script>

<template>
  <header class="border-b border-border bg-surface">
    <div v-if="note" class="bg-dark px-4 py-2 text-center text-xs uppercase tracking-widest text-on-dark">
      <NuxtLink v-if="note.link" :to="note.link">{{ note.text }}</NuxtLink>
      <span v-else>{{ note.text }}</span>
    </div>
    <div class="mx-auto flex max-w-screen-xl items-center justify-between gap-4 px-4 py-4">
      <NuxtLink to="/" class="flex items-center" :aria-label="s?.company_name">
        <NuxtImg v-if="s?.logo" :src="mediaSrc(s.logo.url)" :alt="s.logo.alt_text" height="40" class="h-10 w-auto" />
        <span v-else class="font-display text-2xl">{{ s?.company_name || 'SoftLadyLux' }}</span>
      </NuxtLink>
      <nav class="flex items-center gap-5 text-sm uppercase tracking-widest" aria-label="Quick links">
        <NuxtLink to="/track" data-track="header_track_order">Track order</NuxtLink>
        <NuxtLink to="/size-guide" data-track="header_find_size">Find my size</NuxtLink>
      </nav>
    </div>
  </header>
</template>
