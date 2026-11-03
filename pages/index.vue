<script setup lang="ts">
// Design: Main board (M1 blocks). SRS WEB-06: fixed layout. Carousel, trust strip, the two
// banners, category tiles, New/Signature/Offers (filled from product flags) and the video gallery.
const { data: home } = await useHome()
const { data: s } = await useSiteSettings()
const tab = ref<'offers' | 'favourites'>('offers')
const banner = (p: string) => home.value?.banners.find((b) => b.placement === p)

useSeoMeta({
  title: () => s.value?.seo_title || s.value?.company_name || 'SoftLadyLux',
  description: () => s.value?.seo_description || s.value?.tagline || ''
})
</script>

<template>
  <div class="-mx-4 -mt-8 flex flex-col gap-12">
    <HomeCarousel :slides="home?.carousel ?? []" />
    <section v-if="home?.trust.length" class="mx-auto grid w-full max-w-screen-xl gap-4 px-4 sm:grid-cols-3" aria-label="Why shop with us">
      <div v-for="t in home.trust" :key="t.id" class="border border-border bg-surface p-4 text-center">
        <div class="font-display text-xl">{{ t.title }}</div><p class="hint">{{ t.text }}</p>
      </div>
    </section>
    <section class="mx-auto grid w-full max-w-screen-xl gap-4 px-4 md:grid-cols-2">
      <template v-for="p in ['home_promo', 'home_offer']" :key="p">
        <NuxtLink v-if="banner(p)?.media" :to="banner(p)?.link || '/'" class="relative block" data-track="home_banner">
          <NuxtImg :src="mediaSrc(banner(p)!.media!.url)" :alt="banner(p)!.media!.alt_text" width="800" height="400" class="h-64 w-full object-cover" loading="lazy" />
          <div class="absolute inset-0 flex flex-col justify-end bg-dark/25 p-6 text-on-dark">
            <h3 class="text-3xl">{{ banner(p)!.heading }}</h3><p>{{ banner(p)!.text }}</p>
          </div>
        </NuxtLink>
      </template>
    </section>
    <section v-if="home?.categories.length" class="mx-auto w-full max-w-screen-xl px-4">
      <div class="cap">Shop by category</div><h2 class="mb-4 text-3xl">The wardrobe, edited</h2>
      <ul class="grid grid-cols-2 gap-4 md:grid-cols-4">
        <li v-for="c in home.categories" :key="c.slug">
          <NuxtLink :to="`/shop/${c.slug}`" class="block" data-track="home_category_tile">
            <NuxtImg v-if="c.tile" :src="mediaSrc(c.tile.url)" :alt="c.tile.alt_text || c.name" width="400" height="500" class="aspect-[4/5] w-full object-cover" loading="lazy" />
            <div v-else class="aspect-[4/5] w-full bg-cream" />
            <div class="mt-2 font-display text-xl">{{ c.name }}</div>
          </NuxtLink>
        </li>
      </ul>
    </section>
    <section v-if="home?.new_arrivals.length" class="mx-auto w-full max-w-screen-xl px-4">
      <div class="flex items-end justify-between"><div><div class="cap">Just landed</div><h2 class="mb-4 text-3xl">New arrivals</h2></div><NuxtLink to="/shop/new" class="underline">View all</NuxtLink></div>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4"><ProductCard v-for="p in home.new_arrivals.slice(0, 4)" :key="p.id" :product="p" /></div>
    </section>
    <section v-if="home?.signature.length" class="mx-auto w-full max-w-screen-xl px-4">
      <div class="cap">Signature collection</div><h2 class="mb-4 text-3xl">Our signature pieces</h2>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-3"><ProductCard v-for="p in home.signature.slice(0, 3)" :key="p.id" :product="p" /></div>
    </section>
    <section v-if="home?.offers.length || home?.signature.length" class="mx-auto w-full max-w-screen-xl px-4">
      <div class="cap">Curated for you</div><h2 class="mb-4 text-3xl">Offers &amp; favourites</h2>
      <div class="mb-4 flex gap-2" role="tablist"><button class="tab" :aria-pressed="tab === 'offers'" @click="tab = 'offers'">Offers</button><button class="tab" :aria-pressed="tab === 'favourites'" @click="tab = 'favourites'">Favourites</button></div>
      <div class="grid grid-cols-2 gap-4 md:grid-cols-4"><ProductCard v-for="p in (tab === 'offers' ? home.offers : home.signature).slice(0, 4)" :key="p.id" :product="p" /></div>
    </section>
    <section v-if="home?.videos.length" class="mx-auto w-full max-w-screen-xl px-4">
      <div class="cap">Watch</div><h2 class="mb-4 text-3xl">Video gallery</h2>
      <div class="grid gap-4 sm:grid-cols-3">
        <!-- Links out instead of embedding, so nothing from Google/Facebook loads before cookie consent (M5). -->
        <a v-for="v in home.videos" :key="v.id" :href="v.url" target="_blank" rel="noopener" class="block border border-border bg-surface" data-track="video_open">
          <NuxtImg v-if="v.thumbnail" :src="mediaSrc(v.thumbnail.url)" :alt="v.thumbnail.alt_text" width="640" height="360" class="aspect-video w-full object-cover" loading="lazy" />
          <div class="p-3">{{ v.title }}</div>
        </a>
      </div>
    </section>
    <section class="mx-auto w-full max-w-screen-xl px-4">
      <div class="flex flex-col items-start gap-3 bg-primary-soft p-8">
        <div class="cap">Fit guidance</div><h2 class="text-3xl">Find the size that feels like yours</h2>
        <p class="max-w-xl text-muted">Enter two measurements and our calculator suggests your band and cup size, with a full size chart.</p>
        <NuxtLink to="/size-guide" class="btn" data-track="home_size_finder">Find my size</NuxtLink>
      </div>
    </section>
  </div>
</template>
