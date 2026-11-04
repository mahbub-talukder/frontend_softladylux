<script setup lang="ts">
// SRS STF / UI-08, design: MobileHome. Mobile bottom navigation: Home, Shop, Wishlist, Bag, Account.
const cart = useCartStore()
const customer = useCustomerStore()
const items = computed(() => [
  { label: 'Home', to: '/', d: 'M3 11l9-8 9 8M5 10v10h14V10' },
  { label: 'Shop', to: '/shop/offers', d: 'M3 7h18l-2 13H5zM8 7a4 4 0 0 1 8 0' },
  { label: 'Wishlist', to: '/account?tab=wishlist', d: 'M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.7 3.7 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.3 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5z', badge: customer.wishIds.length },
  { label: 'Bag', to: '/cart', d: 'M5 8h14l-1 12H6zM9 8V6.5a3 3 0 0 1 6 0V8', badge: cart.count },
  { label: 'Account', to: customer.isIn ? '/account' : '/login', d: 'M16 8a4 4 0 1 0-8 0 4 4 0 0 0 8 0zM4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5' }
])
</script>

<template>
  <nav class="fixed inset-x-0 bottom-0 z-20 grid grid-cols-5 border-t border-border bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden" aria-label="Main">
    <NuxtLink v-for="i in items" :key="i.label" :to="i.to" class="relative flex min-h-[56px] flex-col items-center justify-center gap-0.5 text-[11px]" :active-class="i.to === '/' ? '' : 'text-accent'" exact-active-class="text-accent" :data-track="`bottom_nav_${i.label.toLowerCase()}`">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" aria-hidden="true"><path :d="i.d" /></svg>{{ i.label }}
      <span v-if="i.badge" class="absolute right-4 top-1 flex h-4 min-w-4 items-center justify-center bg-accent px-1 text-[10px] text-primary-contrast">{{ i.badge }}</span>
    </NuxtLink>
  </nav>
</template>
