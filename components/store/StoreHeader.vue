<script setup lang="ts">
// Design: Header board. Dark announcement bar; 84px header (wordmark with italic accent and tagline,
// 560px search, Track order / Find my size, icons with count badges); categories bar with an active
// underline. SRS STF: no contact bar and no floating chat button. On phones the categories move
// into a slide-in menu behind a hamburger (MobileHome board).
const { data: s } = await useSiteSettings()
const { data: home } = await useHome()
const { data: cats } = await useCategories()
const cart = useCartStore()
const customer = useCustomerStore()
const route = useRoute()
const menu = ref(false)
const note = computed(() => home.value?.announcements?.[0])
const words = computed(() => {
  const n = s.value?.company_name || 'SoftLadyLux'
  const i = n.search(/[A-Z][a-z]+$/) // "SoftLady" + italic "Lux" style split on the last capitalised word
  return i > 0 ? [n.slice(0, i), n.slice(i)] : [n, '']
})
watch(() => route.fullPath, () => { menu.value = false })
watch(menu, (o) => { if (import.meta.client) document.documentElement.style.overflow = o ? 'hidden' : '' })
const active = (slug: string) => route.path === `/shop/${slug}`
</script>

<template>
  <header class="relative z-50 bg-bg">
    <div v-if="note" class="bg-dark px-5 py-[11px] text-center text-xs uppercase leading-[14px] tracking-[0.14em] text-on-dark/90">
      <NuxtLink v-if="note.link" :to="note.link" class="transition-opacity hover:opacity-80">{{ note.text }}</NuxtLink>
      <span v-else>{{ note.text }}</span>
    </div>

    <div class="wrap grid h-16 grid-cols-[auto_1fr_auto] items-center gap-3 md:h-[84px] md:grid-cols-[minmax(0,1fr)_minmax(0,560px)_minmax(0,1fr)] md:gap-8">
      <div class="flex items-center gap-1">
        <button class="-ml-2 inline-flex h-11 w-11 items-center justify-center md:hidden" :aria-expanded="menu" aria-controls="mobile-menu" aria-label="Open menu" @click="menu = true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <NuxtLink to="/" class="flex flex-col leading-none" :aria-label="`${s?.company_name} home`">
          <NuxtImg v-if="s?.logo" format="webp" :src="mediaSrc(s.logo.url)" :alt="s.logo.alt_text" height="40" class="h-10 w-auto" />
          <template v-else>
            <span class="font-display text-[26px] font-medium tracking-[0.06em] md:text-[34px]">{{ words[0] }}<span v-if="words[1]" class="italic text-accent">{{ words[1] }}</span></span>
            <span class="mt-[5px] hidden text-[9.5px] uppercase tracking-[0.42em] text-gold md:block">{{ s?.tagline && s.tagline.length < 32 ? s.tagline : 'Fashion & Intimates' }}</span>
          </template>
        </NuxtLink>
      </div>

      <StoreSearch class="hidden md:block" />

      <nav class="flex items-center justify-end gap-1 md:gap-[22px]" aria-label="Shortcuts">
        <NuxtLink to="/track" class="hidden whitespace-nowrap text-xs font-medium uppercase leading-tight tracking-[0.14em] transition-colors hover:text-accent lg:block" data-track="header_track_order">Track<br>order</NuxtLink>
        <NuxtLink to="/size-guide" class="hidden whitespace-nowrap text-xs font-medium uppercase leading-tight tracking-[0.14em] transition-colors hover:text-accent lg:block" data-track="header_find_size">Find my<br>size</NuxtLink>
        <span class="hidden h-[22px] w-px bg-field lg:block" />
        <NuxtLink to="/wishlist" class="relative hidden h-11 w-11 items-center justify-center transition-colors hover:text-accent sm:flex" :aria-label="`Wishlist, ${customer.wishIds.length} items`" data-track="header_wishlist">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.7 3.7 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.3 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5z" /></svg>
          <span v-if="customer.wishIds.length" class="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-medium text-primary-contrast">{{ customer.wishIds.length }}</span>
        </NuxtLink>
        <NuxtLink :to="customer.isIn ? '/account' : '/login'" class="hidden h-11 w-11 items-center justify-center transition-colors hover:text-accent sm:flex" :aria-label="customer.isIn ? 'My account' : 'Log in'" data-track="header_account">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5" /></svg>
        </NuxtLink>
        <NuxtLink to="/cart" class="relative flex h-11 w-11 items-center justify-center transition-colors hover:text-accent" :aria-label="`Shopping bag, ${cart.count} items`" data-track="header_bag">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
          <span v-if="cart.count" class="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-[10.5px] font-medium text-primary-contrast">{{ cart.count }}</span>
        </NuxtLink>
      </nav>
    </div>

    <div class="wrap pb-3 md:hidden"><StoreSearch /></div>

    <nav class="hidden border-y border-border bg-bg md:block" aria-label="Categories">
      <ul class="wrap flex flex-wrap justify-center gap-1.5">
        <li v-for="c in cats ?? []" :key="c.slug"><NuxtLink :to="`/shop/${c.slug}`" class="block border-b-2 px-5 py-4 text-[12.5px] font-medium uppercase tracking-[0.16em] transition-colors hover:text-accent" :class="active(c.slug) ? 'border-accent' : 'border-transparent'">{{ c.name }}</NuxtLink></li>
        <li><NuxtLink to="/shop/offers" class="block border-b-2 px-5 py-4 text-[12.5px] font-medium uppercase tracking-[0.16em] text-accent transition-colors hover:text-ink" :class="route.path === '/shop/offers' ? 'border-accent' : 'border-transparent'">Offers</NuxtLink></li>
      </ul>
    </nav>

    <!-- Mobile menu (slide-in) -->
    <Transition enter-active-class="transition-opacity duration-300" leave-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div v-if="menu" class="fixed inset-0 z-50 bg-dark/50 md:hidden" aria-hidden="true" @click="menu = false" />
    </Transition>
    <Transition enter-active-class="transition-transform duration-300 ease-out" leave-active-class="transition-transform duration-200 ease-in" enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
      <aside v-if="menu" id="mobile-menu" class="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-bg md:hidden" aria-label="Menu" @keydown.esc="menu = false">
        <div class="flex h-16 items-center justify-between border-b border-border px-5"><span class="font-display text-2xl">{{ words[0] }}<span class="italic text-accent">{{ words[1] }}</span></span><button class="h-11 w-11" aria-label="Close menu" @click="menu = false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
        <ul class="flex flex-col py-2"><li v-for="c in cats ?? []" :key="c.slug"><NuxtLink :to="`/shop/${c.slug}`" class="flex min-h-[52px] items-center justify-between border-b border-border px-5 text-[13px] font-medium uppercase tracking-[0.16em]">{{ c.name }}<span class="text-muted">›</span></NuxtLink></li><li><NuxtLink to="/shop/offers" class="flex min-h-[52px] items-center px-5 text-[13px] font-medium uppercase tracking-[0.16em] text-accent">Offers</NuxtLink></li></ul>
        <div class="mt-auto flex flex-col gap-1 border-t border-border p-5 text-sm"><NuxtLink to="/track" class="py-2.5">Track order</NuxtLink><NuxtLink to="/size-guide" class="py-2.5">Find my size</NuxtLink><NuxtLink :to="customer.isIn ? '/account' : '/login'" class="py-2.5">{{ customer.isIn ? 'My account' : 'Log in / Register' }}</NuxtLink></div>
      </aside>
    </Transition>
  </header>
</template>
