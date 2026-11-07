<script setup lang="ts">
// Design: Main board, hero carousel. Two columns: a cream text panel (eyebrow, 72px headline,
// paragraph, two buttons, prev/next squares and bar dots) and a tinted image panel with an inner
// frame and a caption. SRS WEB-01: at most 8 active slides, no scheduling. Slides advance on their own
// every 6 s with a soft cross-fade; hover, keyboard focus, a hidden tab or reduced-motion pause it.
// Task 2 (SRS WEB-09, UI-05): the picture is a literal CSS background (cover, no-repeat, centre) inside a
// fixed-height box per breakpoint, so any upload ratio fills it and never changes its size. Phones
// (< 640 px) use `mobile_media` when set, wider screens use `media`. The first slide is preloaded (LCP).
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
  timer = setInterval(() => { if (n.value > 1 && !paused.value && !document.hidden) slide(1) }, 6000)
})
onBeforeUnmount(() => clearInterval(timer))

// IPX URLs at fixed target widths (1x and 2x). Height is left open: `cover` does the cropping.
const img = useImage()
const bg = (src: string, w: number) => `url("${img(mediaSrc(src), { width: w, format: 'webp', quality: 80 })}") 1x, url("${img(mediaSrc(src), { width: w * 2, format: 'webp', quality: 70 })}") 2x`
const vars = (x: Slide) => ({
  '--hero-d': `image-set(${bg(x.media.url, 1200)})`,
  '--hero-m': `image-set(${bg((x.mobile_media ?? x.media).url, 640)})`
})
const srcset = (src: string, w: number) => `${img(mediaSrc(src), { width: w, format: 'webp', quality: 80 })} 1x, ${img(mediaSrc(src), { width: w * 2, format: 'webp', quality: 70 })} 2x`
const first = props.slides[0]
if (first?.media?.url) {
  useHead({
    link: [
      { rel: 'preload', as: 'image', fetchpriority: 'high', media: '(min-width: 640px)', imagesrcset: srcset(first.media.url, 1200) },
      { rel: 'preload', as: 'image', fetchpriority: 'high', media: '(max-width: 639px)', imagesrcset: srcset((first.mobile_media ?? first.media).url, 640) }
    ]
  })
}
// Drag slider (owner request): the picture follows the pointer; release past ~20 % of the width (or 80 px) to slide to the
// neighbour, otherwise it springs back. Only prev / current / next are rendered, so wrapping from last to first is a
// normal one-step slide. Vertical scrolling stays native (touch-action: pan-y); arrows, autoplay and swipes share slide().
const box = ref<HTMLElement | null>(null)
const dragX = ref(0)
const settling = ref(false)
let pending: 1 | -1 | 0 = 0
let settleTimer: ReturnType<typeof setTimeout> | undefined
const width = () => box.value?.clientWidth ?? 600
const reduced = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
const slots = computed(() => {
  const m = n.value
  if (!m) return []
  const at = (o: number) => ({ off: o, x: props.slides[(i.value + o + m * 2) % m] as Slide })
  return m > 1 ? [at(-1), at(0), at(1)] : [at(0)]
})
function finish() {
  if (!settling.value) return
  clearTimeout(settleTimer)
  if (pending) i.value = (i.value + pending + n.value) % n.value
  pending = 0
  settling.value = false
  dragX.value = 0
}
function settle(dir: 1 | -1 | 0) {
  pending = dir
  if (reduced()) { finish(); return }
  settling.value = true
  dragX.value = -dir * width()
  clearTimeout(settleTimer)
  settleTimer = setTimeout(finish, 450) // transitionend can be skipped (hidden tab, no movement)
}
function slide(dir: 1 | -1) { if (n.value > 1 && !settling.value) settle(dir) }
let sx = 0, sy = 0, active = false, dragging = false
function swipeStart(e: PointerEvent) { if (n.value > 1 && !settling.value) { active = true; dragging = false; sx = e.clientX; sy = e.clientY } }
function swipeMove(e: PointerEvent) {
  if (!active) return
  const dx = e.clientX - sx, dy = e.clientY - sy
  if (!dragging) {
    if (Math.abs(dx) < 6 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    dragging = true
    box.value?.setPointerCapture(e.pointerId)
  }
  dragX.value = dx
}
function swipeEnd(e: PointerEvent) {
  if (!active) return
  active = false
  if (!dragging) return
  dragging = false
  const dx = e.clientX - sx
  if (Math.abs(dx) >= Math.min(80, width() * 0.2)) settle(dx < 0 ? 1 : -1)
  else settle(0)
}
function swipeCancel() { if (dragging) { dragging = false; active = false; settle(0) } else active = false }
onBeforeUnmount(() => clearTimeout(settleTimer))
const sizeFinder = useSizeFinder()
const href = (x: Slide) => (x.link_type === 'category' ? `/shop/${x.link_value}` : x.link_type === 'product' ? `/product/${x.link_value}` : x.link_value || '/shop/new')
</script>

<template>
  <section v-if="s" class="grid min-h-[460px] gap-y-6 bg-bg py-6 md:min-h-[520px] md:py-8 lg:grid-cols-[5fr_7fr] lg:items-stretch lg:py-10" aria-roledescription="carousel" aria-label="Featured" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <!-- Alignment (owner request): the section owns the vertical padding and both columns stretch to the same height, so the
         eyebrow starts exactly where the picture starts and the slide controls end exactly where the picture ends. Between them the
         heading, subtext and CTA buttons share the free space (flex-1). No per-column offsets to drift at other widths. -->
    <div class="order-2 flex flex-col justify-between gap-8 px-5 md:px-10 lg:order-1 lg:pl-[max(40px,calc((100vw-1320px)/2+40px))] lg:pr-[72px]">
      <Transition mode="out-in" enter-active-class="transition duration-500 ease-out" leave-active-class="transition duration-200 ease-in" enter-from-class="translate-y-2 opacity-0" leave-to-class="opacity-0">
        <div :key="`e${s.id}`" aria-live="polite"><div v-if="s.eyebrow" class="eyebrow">{{ s.eyebrow }}</div></div>
      </Transition>
      <div class="flex flex-1 flex-col justify-center gap-6">
        <Transition mode="out-in" enter-active-class="transition duration-500 ease-out" leave-active-class="transition duration-200 ease-in" enter-from-class="translate-y-2 opacity-0" leave-to-class="opacity-0">
          <div :key="s.id" class="flex flex-col gap-5">
            <h1 class="h-display max-w-[520px]">{{ s.heading }}</h1>
            <p v-if="s.subtext" class="max-w-[430px] text-[17px] leading-[1.6] text-body">{{ s.subtext }}</p>
          </div>
        </Transition>
        <Transition mode="out-in" enter-active-class="transition duration-500 ease-out" leave-active-class="transition duration-200 ease-in" enter-from-class="translate-y-2 opacity-0" leave-to-class="opacity-0">
        <div :key="`cta${s.id}`" class="flex flex-wrap gap-4">
          <NuxtLink v-if="s.button_label" :to="href(s)" class="btn" data-track="hero_cta">{{ s.button_label }}</NuxtLink>
          <button type="button" class="btn-o" aria-haspopup="dialog" data-track="hero_find_size" @click="sizeFinder.show()">Find your size</button>
        </div>
        </Transition>
      </div>
      <!-- Slide controls close the column, so their bottom edge is the picture's bottom edge. -->
      <div v-if="n > 1" class="flex flex-wrap items-center gap-x-3.5 gap-y-1">
        <button class="arrow-btn" aria-label="Previous slide" @click="slide(-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button class="arrow-btn" aria-label="Next slide" @click="slide(1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
        <div class="ml-1 flex flex-wrap items-center"><button v-for="(x, k) in slides" :key="x.id" class="flex h-11 min-w-touch items-center justify-center" :aria-label="`Go to slide ${k + 1}`" :aria-current="k === i" @click="go(k)"><span class="block h-[3px] transition-all duration-300" :class="k === i ? 'w-9 bg-primary' : 'w-5 bg-field'" /></button></div>
      </div>
    </div>
    <!-- Owner request: section follows the theme background (THM-03); the picture sits in a borderless box with a 5 px radius; swipe or drag it to change slides. -->
    <div class="order-1 h-[320px] px-4 sm:h-[400px] md:px-6 lg:order-2 lg:h-auto lg:pl-0 lg:pr-[max(40px,calc((100vw-1320px)/2+40px))]">
      <div ref="box" class="relative h-full cursor-grab touch-pan-y select-none overflow-hidden rounded-[5px] bg-cream active:cursor-grabbing" @pointerdown="swipeStart" @pointermove="swipeMove" @pointerup="swipeEnd" @pointercancel="swipeCancel" @dragstart.prevent>
        <div class="absolute inset-0 will-change-transform" :class="settling ? 'transition-transform duration-[350ms] ease-out' : ''" :style="{ transform: `translate3d(${dragX}px,0,0)` }" @transitionend.self="finish">
          <div v-for="slot in slots" :key="`${slot.off}-${slot.x.id}`" class="absolute inset-0" :style="{ left: `${slot.off * 100}%` }" :aria-hidden="slot.off !== 0 ? 'true' : undefined">
            <div v-if="slot.x.media?.url" role="img" :aria-label="slot.x.media.alt_text || slot.x.heading" class="hero-bg absolute inset-0" :style="vars(slot.x)" />
            <StoreTile v-else src="" ratio="auto" tint="bg-tile-1" class="h-full !aspect-auto" art-width="380px" category="bras" />
          </div>
        </div>
        <div class="pointer-events-none absolute bottom-3 right-3 bg-bg/80 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-ink backdrop-blur-sm md:bottom-5 md:right-5">{{ (i % n) + 1 }} / {{ n }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* WEB-09: literal CSS background, as the owner asked. Fixed box, any ratio fills it. */
.hero-bg { background-image: var(--hero-m); background-size: cover; background-repeat: no-repeat; background-position: center; }
@media (min-width: 640px) { .hero-bg { background-image: var(--hero-d); } }
</style>
