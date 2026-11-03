<script setup lang="ts">
// Design: Header board. SRS STF: announcement bar, logo, search with suggestions, Find My Size,
// Track Order, category bar. Wishlist, account and bag arrive with M3/M4. No contact bar and no
// floating chat button (SD decisions).
const { data: s } = await useSiteSettings()
const { data: home } = await useHome()
const { data: cats } = await useCategories()
const note = computed(() => home.value?.announcements?.[0])
</script>

<template>
  <header class="border-b border-border bg-surface">
    <div v-if="note" class="bg-dark px-4 py-2 text-center text-xs uppercase tracking-widest text-on-dark">
      <NuxtLink v-if="note.link" :to="note.link">{{ note.text }}</NuxtLink>
      <span v-else>{{ note.text }}</span>
    </div>
    <div class="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-4 px-4 py-4">
      <NuxtLink to="/" class="flex items-center" :aria-label="s?.company_name">
        <NuxtImg v-if="s?.logo" :src="mediaSrc(s.logo.url)" :alt="s.logo.alt_text" height="40" class="h-10 w-auto" />
        <span v-else class="font-display text-2xl">{{ s?.company_name || 'SoftLadyLux' }}</span>
      </NuxtLink>
      <StoreSearch class="order-last w-full md:order-none md:w-auto md:flex-1" />
      <nav class="flex items-center gap-5 text-sm uppercase tracking-widest" aria-label="Quick links">
        <NuxtLink to="/track" data-track="header_track_order">Track order</NuxtLink>
        <NuxtLink to="/size-guide" data-track="header_find_size">Find my size</NuxtLink>
      </nav>
    </div>
    <nav class="mx-auto max-w-screen-xl overflow-x-auto px-4" aria-label="Categories">
      <ul class="flex min-w-max gap-6 text-[13px] uppercase tracking-widest">
        <li v-for="c in cats ?? []" :key="c.slug"><NuxtLink :to="`/shop/${c.slug}`" class="block py-3" active-class="border-b-2 border-primary">{{ c.name }}</NuxtLink></li>
        <li><NuxtLink to="/shop/offers" class="block py-3 text-accent" active-class="border-b-2 border-primary">Offers</NuxtLink></li>
      </ul>
    </nav>
  </header>
</template>
