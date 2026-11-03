<script setup lang="ts">
// Design: Main board (M1 blocks). SRS WEB-06: fixed layout. Carousel, trust strip, the two
// banners and the video gallery are live; category tiles, product sections and the size-finder
// band arrive with the catalogue (M2).
const { data: home } = await useHome()
const { data: s } = await useSiteSettings()
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
  </div>
</template>
