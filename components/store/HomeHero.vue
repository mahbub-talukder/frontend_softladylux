<script setup lang="ts">
// Design: Main board, hero carousel. Two columns: a cream text panel (eyebrow, 72px headline,
// paragraph, two buttons, prev/next squares and bar dots) and a tinted image panel with an inner
// frame and a caption. SRS WEB-01: at most 8 active slides, no scheduling. Slides advance on their own
// every 6 s with a soft cross-fade; hover, keyboard focus, a hidden tab or reduced-motion pause it.
import type { Slide } from '~/types/api'

const props = defineProps<{ slides: Slide[] }>()
const i = ref(0)
const n = computed(() => props.slides.length)
const s = computed(() => props.slides[i.value % Math.max(n.value, 1)])
const go = (k: number) => { i.value = (k + n.value) % n.value }
const paused = ref(false)
let timer: ReturnType<typeof setInterval> | undefined
onMounted(() => {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  timer = setInterval(() => { if (n.value > 1 && !paused.value && !document.hidden) go(i.value + 1) }, 6000)
})
onBeforeUnmount(() => clearInterval(timer))
const href = (x: Slide) => (x.link_type === 'category' ? `/shop/${x.link_value}` : x.link_type === 'product' ? `/product/${x.link_value}` : x.link_value || '/shop/new')
</script>

<template>
  <section v-if="s" class="grid min-h-[560px] bg-cream md:min-h-[640px] lg:grid-cols-[5fr_7fr]" aria-roledescription="carousel" aria-label="Featured" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <div class="order-2 flex flex-col justify-center gap-6 px-5 py-12 md:px-10 lg:order-1 lg:py-0 lg:pl-[max(40px,calc((100vw-1320px)/2+40px))] lg:pr-[72px]">
      <Transition mode="out-in" enter-active-class="transition duration-500 ease-out" leave-active-class="transition duration-200 ease-in" enter-from-class="translate-y-2 opacity-0" leave-to-class="opacity-0">
        <div :key="s.id" class="flex flex-col gap-[26px]" aria-live="polite">
          <div v-if="s.eyebrow" class="eyebrow">{{ s.eyebrow }}</div>
          <h1 class="max-w-[520px] text-[44px] leading-[1.02] md:text-[72px]">{{ s.heading }}</h1>
          <p v-if="s.subtext" class="max-w-[430px] text-[17px] leading-[1.65] text-body">{{ s.subtext }}</p>
          <div class="mt-1.5 flex flex-wrap gap-4">
            <NuxtLink v-if="s.button_label" :to="href(s)" class="btn" data-track="hero_cta">{{ s.button_label }}</NuxtLink>
            <NuxtLink to="/size-guide" class="btn-o" data-track="hero_find_size">Find your size</NuxtLink>
          </div>
        </div>
      </Transition>
      <div v-if="n > 1" class="mt-4 flex items-center gap-3.5 lg:mt-7">
        <button class="arrow-btn" aria-label="Previous slide" @click="go(i - 1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button class="arrow-btn" aria-label="Next slide" @click="go(i + 1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
        <div class="ml-3 flex items-center gap-2"><button v-for="(x, k) in slides" :key="x.id" class="flex h-11 items-center" :aria-label="`Go to slide ${k + 1}`" :aria-current="k === i" @click="go(k)"><span class="block h-[3px] transition-all duration-300" :class="k === i ? 'w-9 bg-primary' : 'w-5 bg-field'" /></button></div>
      </div>
    </div>
    <div class="relative order-1 overflow-hidden lg:order-2">
      <Transition mode="out-in" enter-active-class="transition-opacity duration-500" leave-active-class="transition-opacity duration-200" enter-from-class="opacity-0" leave-to-class="opacity-0">
        <StoreTile :key="s.id" :src="s.media.url" :alt="s.media.alt_text" ratio="auto" tint="bg-tile-1" :width="1100" :height="900" eager sizes="xs:100vw lg:58vw" class="h-full min-h-[320px] !aspect-auto lg:min-h-0" art-width="380px" category="bras" />
      </Transition>
      <div class="pointer-events-none absolute inset-6 border border-gold/35 md:inset-9" />
      <div class="pointer-events-none absolute bottom-7 right-9 text-[11px] uppercase tracking-[0.2em] text-gold md:bottom-[52px] md:right-14">Campaign photo · {{ (i % n) + 1 }} / {{ n }}</div>
    </div>
  </section>
</template>
