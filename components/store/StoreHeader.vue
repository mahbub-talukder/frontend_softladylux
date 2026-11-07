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
const sizeFinder = useSizeFinder()
// Header shadow + compact row after the first few pixels of scroll (passive listener, one rAF per frame).
const scrolled = ref(false)
let raf = 0
const onScroll = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; scrolled.value = window.scrollY > 8 }) }
onMounted(() => { onScroll(); window.addEventListener('scroll', onScroll, { passive: true }) })
onBeforeUnmount(() => { window.removeEventListener('scroll', onScroll); cancelAnimationFrame(raf) })
const notes = computed(() => home.value?.announcements ?? [])
// Marquee speed: ~55 px/s, so a longer message scrolls for longer (never faster).
const marqueeSecs = computed(() => Math.max(18, Math.round(notes.value.reduce((n, a) => n + a.text.length, 0) * 0.22)))
watch(() => route.fullPath, () => { menu.value = false })
watch(menu, (o) => { if (import.meta.client) document.documentElement.style.overflow = o ? 'hidden' : '' })
const active = (slug: string) => route.path === `/shop/${slug}`
</script>

<template>
  <!-- Sticky header (owner request, like embralux.com): the announcement bar scrolls away; the main row and category bar stay
         pinned to the top. `contents` lets the sticky block use the page as its scroll container. Soft: the row shrinks and a
         shadow fades in once the page is scrolled (both transitions; no jump). Phones pin only the main row, so search scrolls away. -->
  <header class="contents">
    <!-- Owner request: the announcement scrolls as a marquee. The track holds the messages twice and slides by
         half its width, so the loop is seamless; hover/focus pause it; reduced-motion shows one static line
         (CSS in main.css). The repeat is aria-hidden so a screen reader hears each message once. -->
    <div v-if="notes.length" class="marquee bg-dark text-xs uppercase leading-4 tracking-[0.14em] text-on-dark/90" role="region" aria-label="Announcements">
      <div class="marquee-track" :style="{ '--marquee-secs': `${marqueeSecs}s` }">
        <div v-for="copy in 2" :key="copy" class="marquee-set" :aria-hidden="copy === 2 ? 'true' : undefined">
          <template v-for="a in notes" :key="`${copy}-${a.id}`">
            <NuxtLink v-if="a.link" :to="a.link" :tabindex="copy === 2 ? -1 : undefined" class="marquee-item transition-opacity hover:opacity-80">{{ a.text }}</NuxtLink>
            <span v-else class="marquee-item">{{ a.text }}</span>
            <span class="marquee-dot" aria-hidden="true">◆</span>
          </template>
        </div>
      </div>
    </div>

    <!-- TEST (owner, to be confirmed): 80 % opacity once stuck -->
    <div class="sticky top-0 z-50 transition-[box-shadow,background-color] duration-300" :class="scrolled ? 'bg-bg/80 shadow-pop backdrop-blur-sm' : 'bg-bg'">
    <div class="wrap grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 transition-[height] duration-300 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-6 2xl:grid-cols-[minmax(0,1fr)_minmax(0,560px)_minmax(0,1fr)] 2xl:gap-8" :class="scrolled ? 'h-14 md:h-16' : 'h-14 md:h-[72px]'">
      <div class="flex min-w-0 items-center gap-1">
        <button class="-ml-2 inline-flex h-11 w-11 items-center justify-center md:hidden" :aria-expanded="menu" aria-controls="mobile-menu" aria-label="Open menu" @click="menu = true">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
        </button>
        <NuxtLink to="/" class="flex min-h-11 flex-col justify-center leading-none" :aria-label="`${s?.company_name} home`">
          <NuxtImg v-if="s?.logo" format="webp" :src="mediaSrc(s.logo.url)" :alt="s.logo.alt_text" height="40" class="h-10 w-auto" />
          <!-- Brand logo (brand/ kit): default when no logo is uploaded in Settings. The mark already carries name and tagline. -->
          <img v-else src="/brand/logo-full.svg" :alt="s?.company_name || 'SoftLadyLux'" width="188" height="48" class="h-9 w-auto md:h-11 lg:h-12">
        </NuxtLink>
      </div>

      <StoreSearch class="hidden min-w-0 md:block 2xl:w-full" />

      <nav class="flex shrink-0 items-center justify-end gap-0.5 md:gap-1 [&>*]:shrink-0" aria-label="Shortcuts">
        <!-- Icons at every desktop width (tooltip + aria-label): text labels did not fit beside a 560 px search on 1280-1600 px screens. -->
        <NuxtLink to="/track" class="hidden h-11 w-11 items-center justify-center transition-colors hover:text-accent md:flex" aria-label="Track order" title="Track order" data-track="header_track_order">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M3 7l9-4 9 4-9 4-9-4z" /><path d="M3 7v10l9 4 9-4V7M12 11v10" /></svg>
        </NuxtLink>
        <button type="button" class="hidden h-11 w-11 items-center justify-center transition-colors hover:text-accent md:flex" aria-label="Find my size" title="Find my size" data-track="header_find_size" aria-haspopup="dialog" @click="sizeFinder.show()">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><rect x="2.5" y="8" width="19" height="8" /><path d="M6 8v3M10 8v4M14 8v3M18 8v4" /></svg>
        </button>
        <span class="hidden h-[22px] w-px bg-field md:block" />
        <NuxtLink to="/wishlist" class="relative hidden h-11 w-11 items-center justify-center transition-colors hover:text-accent sm:flex" :aria-label="`Wishlist, ${customer.wishIds.length} items`" data-track="header_wishlist">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-9.2-9.4C1.7 7.7 3.7 4.5 7 4.5c2 0 3.7 1.1 5 3 1.3-1.9 3-3 5-3 3.3 0 5.3 3.2 4.2 6.6C19.5 15.9 12 20.5 12 20.5z" /></svg>
          <span v-if="customer.wishIds.length" class="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-xs font-medium text-primary-contrast">{{ customer.wishIds.length }}</span>
        </NuxtLink>
        <NuxtLink :to="customer.isIn ? '/account' : '/login'" class="hidden h-11 w-11 items-center justify-center transition-colors hover:text-accent sm:flex" :aria-label="customer.isIn ? 'My account' : 'Log in'" data-track="header_account">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><circle cx="12" cy="8" r="4" /><path d="M4 21c1-4.5 4.2-6.5 8-6.5s7 2 8 6.5" /></svg>
        </NuxtLink>
        <NuxtLink to="/cart" class="relative flex h-11 w-11 items-center justify-center transition-colors hover:text-accent" :aria-label="`Shopping bag, ${cart.count} items`" data-track="header_bag">
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M5 8h14l-1 12H6z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></svg>
          <span v-if="cart.count" class="absolute right-0.5 top-1 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-accent px-1 text-xs font-medium text-primary-contrast">{{ cart.count }}</span>
        </NuxtLink>
      </nav>
    </div>

    <nav class="hidden border-y border-border md:block" aria-label="Categories">
      <!-- One row at every width: centred when it fits, scrollable when it does not (never wraps) -->
      <ul class="wrap flex flex-nowrap gap-1 overflow-x-auto [scrollbar-width:none] lg:gap-1.5 [&>li:first-child]:ml-auto [&>li:last-child]:mr-auto [&::-webkit-scrollbar]:hidden">
        <li v-for="c in cats ?? []" :key="c.slug" class="shrink-0"><NuxtLink :to="`/shop/${c.slug}`" class="block whitespace-nowrap border-b-2 px-4 py-3.5 text-[12.5px] font-medium uppercase tracking-[0.16em] transition-colors hover:text-accent" :class="active(c.slug) ? 'border-accent' : 'border-transparent'">{{ c.name }}</NuxtLink></li>
        <li class="shrink-0"><NuxtLink to="/shop/offers" class="block whitespace-nowrap border-b-2 px-4 py-3.5 text-[12.5px] font-medium uppercase tracking-[0.16em] text-accent transition-colors hover:text-ink" :class="route.path === '/shop/offers' ? 'border-accent' : 'border-transparent'">Offers</NuxtLink></li>
      </ul>
    </nav>
    </div>
    <div class="wrap pb-3 md:hidden"><StoreSearch /></div>

    <!-- Mobile menu (slide-in) -->
    <Transition enter-active-class="transition-opacity duration-300" leave-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-to-class="opacity-0">
      <div v-if="menu" class="fixed inset-0 z-50 bg-dark/50 md:hidden" aria-hidden="true" @click="menu = false" />
    </Transition>
    <Transition enter-active-class="transition-transform duration-300 ease-out" leave-active-class="transition-transform duration-200 ease-in" enter-from-class="-translate-x-full" leave-to-class="-translate-x-full">
      <aside v-if="menu" id="mobile-menu" class="fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col overflow-y-auto bg-bg md:hidden" aria-label="Menu" @keydown.esc="menu = false">
        <div class="flex h-14 items-center justify-between border-b border-border px-5"><img src="/brand/logo-full.svg" :alt="s?.company_name || 'SoftLadyLux'" width="141" height="36" class="h-9 w-auto"><button class="h-11 w-11" aria-label="Close menu" @click="menu = false"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button></div>
        <ul class="flex flex-col py-2"><li v-for="c in cats ?? []" :key="c.slug"><NuxtLink :to="`/shop/${c.slug}`" class="flex min-h-[52px] items-center justify-between border-b border-border px-5 text-[13px] font-medium uppercase tracking-[0.16em]">{{ c.name }}<span class="text-muted">›</span></NuxtLink></li><li><NuxtLink to="/shop/offers" class="flex min-h-[52px] items-center px-5 text-[13px] font-medium uppercase tracking-[0.16em] text-accent">Offers</NuxtLink></li></ul>
        <div class="mt-auto flex flex-col gap-1 border-t border-border p-5 text-sm"><NuxtLink to="/track" class="flex min-h-11 items-center">Track order</NuxtLink><button type="button" class="flex min-h-11 items-center text-left" aria-haspopup="dialog" @click="menu = false; sizeFinder.show()">Find my size</button><NuxtLink :to="customer.isIn ? '/account' : '/login'" class="flex min-h-11 items-center">{{ customer.isIn ? 'My account' : 'Log in / Register' }}</NuxtLink></div>
      </aside>
    </Transition>
  </header>
</template>
