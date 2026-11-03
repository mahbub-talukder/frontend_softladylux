<script setup lang="ts">
// SRS WEB-01: hero carousel (max 8 active slides, no scheduling). Dots use the primary token.
import type { Slide } from '~/types/api'

const props = defineProps<{ slides: Slide[] }>()
const i = ref(0)
const go = (n: number) => { i.value = (n + props.slides.length) % props.slides.length }
const href = (s: Slide) => (s.link_type === 'category' ? `/shop/${s.link_value}` : s.link_type === 'product' ? `/product/${s.link_value}` : s.link_value)
</script>

<template>
  <section v-if="slides.length" class="relative" aria-roledescription="carousel" aria-label="Featured">
    <div v-for="(s, n) in slides" v-show="n === i" :key="s.id" class="relative">
      <picture>
        <source v-if="s.mobile_media" media="(max-width: 767px)" :srcset="mediaSrc(s.mobile_media.url)">
        <NuxtImg :src="mediaSrc(s.media.url)" :alt="s.media.alt_text" width="1600" height="900" sizes="100vw" :loading="n === 0 ? 'eager' : 'lazy'" class="h-[420px] w-full object-cover md:h-[560px]" />
      </picture>
      <div class="absolute inset-0 flex items-center bg-dark/30">
        <div class="mx-auto w-full max-w-screen-xl px-4 text-on-dark">
          <div v-if="s.eyebrow" class="text-xs uppercase tracking-[0.3em] text-accent">{{ s.eyebrow }}</div>
          <h2 v-if="s.heading" class="mt-2 max-w-xl text-4xl md:text-6xl">{{ s.heading }}</h2>
          <p v-if="s.subtext" class="mt-3 max-w-md">{{ s.subtext }}</p>
          <NuxtLink v-if="s.button_label && href(s)" :to="href(s)" class="btn mt-6" data-track="hero_cta">{{ s.button_label }}</NuxtLink>
        </div>
      </div>
    </div>
    <template v-if="slides.length > 1">
      <button class="absolute left-2 top-1/2 min-h-touch min-w-touch bg-surface/80" aria-label="Previous slide" @click="go(i - 1)">‹</button>
      <button class="absolute right-2 top-1/2 min-h-touch min-w-touch bg-surface/80" aria-label="Next slide" @click="go(i + 1)">›</button>
      <div class="absolute bottom-3 left-0 right-0 flex justify-center gap-2">
        <button v-for="(s, n) in slides" :key="s.id" class="h-2.5 w-2.5" :class="n === i ? 'bg-primary' : 'bg-primary-soft'" :aria-label="`Slide ${n + 1}`" :aria-current="n === i" @click="go(n)" />
      </div>
    </template>
  </section>
</template>
