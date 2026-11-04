<script setup lang="ts">
// Design: Header board. SRS STF: announcement bar, logo, search with suggestions, Find My Size,
// Track Order, category bar. Wishlist, account and bag arrive with M3/M4. No contact bar and no
// floating chat button (SD decisions).
const { data: s } = await useSiteSettings()
const { data: home } = await useHome()
const { data: cats } = await useCategories()
const note = computed(() => home.value?.announcements?.[0])
const cart = useCartStore()
const customer = useCustomerStore()
</script>

<template>
  <header class="border-b border-border bg-surface">
    <div v-if="note" class="bg-dark px-4 py-2 text-center text-xs uppercase tracking-widest text-on-dark">
      <NuxtLink v-if="note.link" :to="note.link">{{ note.text }}</NuxtLink>
      <span v-else>{{ note.text }}</span>
    </div>
    <div class="mx-auto flex max-w-screen-xl flex-wrap items-center justify-between gap-4 px-4 py-4">
      <NuxtLink to="/" class="flex items-center" :aria-label="s?.company_name">
        <NuxtImg v-if="s?.logo" format="webp" :src="mediaSrc(s.logo.url)" :alt="s.logo.alt_text" height="40" class="h-10 w-auto" />
        <span v-else class="font-display text-2xl">{{ s?.company_name || 'SoftLadyLux' }}</span>
      </NuxtLink>
      <StoreSearch class="order-last w-full md:order-none md:w-auto md:flex-1" />
      <nav class="flex items-center gap-5 text-sm uppercase tracking-widest" aria-label="Quick links">
        <NuxtLink to="/track" data-track="header_track_order">Track order</NuxtLink>
        <NuxtLink to="/size-guide" data-track="header_find_size">Find my size</NuxtLink>
        <NuxtLink to="/account?tab=wishlist" class="relative hidden min-h-touch min-w-touch items-center justify-center sm:inline-flex" :aria-label="`Wishlist, ${customer.wishIds.length} items`" data-track="header_wishlist">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.7 3.7 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.3 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5z" /></svg>
          <span v-if="customer.wishIds.length" class="absolute right-0 top-1 flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[11px] text-primary-contrast">{{ customer.wishIds.length }}</span>
        </NuxtLink>
        <NuxtLink :to="customer.isIn ? '/account' : '/login'" class="hidden min-h-touch min-w-touch items-center justify-center sm:inline-flex" :aria-label="customer.isIn ? 'My account' : 'Log in'" data-track="header_account">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5" /></svg>
        </NuxtLink>
        <NuxtLink to="/cart" class="relative inline-flex min-h-touch min-w-touch items-center justify-center" :aria-label="`Shopping bag, ${cart.count} items`" data-track="header_bag">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
          <span v-if="cart.count" class="absolute right-0 top-1 flex h-5 min-w-5 items-center justify-center bg-accent px-1 text-[11px] text-primary-contrast">{{ cart.count }}</span>
        </NuxtLink>
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
