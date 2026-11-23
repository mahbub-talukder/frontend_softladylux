<script setup lang="ts">
// Design: Main board, hero carousel. Two columns: a text panel (eyebrow, display headline, paragraph, two buttons,
// prev/next squares and bar dots) and the picture panel. SRS WEB-01: at most 8 active slides, no scheduling; phones
// (< 640 px) use `mobile_media` when set, wider screens use `media`. The first slide is preloaded (LCP).
//
// v1.11 (WEB-01 / WEB-12, owner feedback, modelled on the reference site's Embla slider):
// - One continuous track of real <img> slides that moves as a single strip with a smooth eased transform. Every slide
//   is always rendered (decoded once, never re-created); a clone of the last slide sits before the first and a clone of
//   the first after the last, so the loop is seamless (after reaching a clone the track jumps, invisibly, to the real one).
// - Each picture covers its box (object-fit: cover), so there are never empty bands. On phones the box takes the
//   pictures' own shape (first slide's ratio), so they fill it without being cut.
// - Autoplay every 5 s, and never onto a slide whose picture is not decoded yet (cold image cache: 3–6 s per picture).
// - All slide texts sit stacked in one grid cell and cross-fade, so the text area keeps one height: nothing below jumps.
// Pause on hover, keyboard focus, a hidden tab or prefers-reduced-motion. Swipe/drag follows the finger.
import type { Slide } from '~/types/api'

const props = defineProps<{ slides: Slide[] }>()
const img = useImage()
const n = computed(() => props.slides.length)
const loop = computed(() => n.value > 1)
// Track = [clone of last, ...slides, clone of first] when looping; `pos` indexes the track.
const track = computed(() => (loop.value ? [props.slides[n.value - 1]!, ...props.slides, props.slides[0]!] : props.slides))
const pos = ref(loop.value ? 1 : 0)
const i = computed(() => (loop.value ? (pos.value - 1 + n.value) % n.value : 0)) // logical slide
const s = computed(() => props.slides[i.value])
const animating = ref(false)
const dragX = ref(0)
const box = ref<HTMLElement | null>(null)
const reduced = () => import.meta.client && window.matchMedia('(prefers-reduced-motion: reduce)').matches
let endTimer: ReturnType<typeof setTimeout> | undefined

function moveTo(p: number) {
  if (!loop.value) return
  dragX.value = 0
  if (reduced()) { pos.value = p; settle(); return }
  animating.value = true
  pos.value = p
  clearTimeout(endTimer)
  endTimer = setTimeout(settle, 800) // transitionend can be skipped (hidden tab)
}
// After a move: if we landed on a clone, jump (without animation) to the real slide it copies.
function settle() {
  clearTimeout(endTimer)
  animating.value = false
  if (pos.value === 0) pos.value = n.value
  else if (pos.value === n.value + 1) pos.value = 1
}
const slide = (dir: 1 | -1) => { if (!animating.value) moveTo(pos.value + dir) }
const go = (k: number) => { if (!animating.value && k !== i.value) moveTo(k + 1) }

// ---------------------------------------------------------------- autoplay (5 s, waits for the next picture)
const INTERVAL = 5000
const paused = ref(false)
const ready = ref<Set<number>>(new Set())
const isReady = (x: Slide) => !x.media?.url || ready.value.has(x.id)
let timer: ReturnType<typeof setTimeout> | undefined
function schedule(delay = INTERVAL) {
  clearTimeout(timer)
  timer = setTimeout(() => {
    if (!loop.value || paused.value || document.hidden || animating.value || dragging) return schedule(1000)
    if (!isReady(props.slides[(i.value + 1) % n.value]!)) return schedule(300)
    slide(1)
    schedule()
  }, delay)
}

// ---------------------------------------------------------------- pictures (<img> with 1x/2x, same URLs for preload)
const url = (src: string, w: number, q: number) => img(mediaSrc(src), { width: w, format: 'webp', quality: q })
const set = (src: string, w: number) => `${url(src, w, 80)} 1x, ${url(src, w * 2, 70)} 2x`
const mobileSrc = (x: Slide) => (x.mobile_media ?? x.media).url
function shownUrl(x: Slide) {
  const phone = window.matchMedia('(max-width: 639px)').matches
  const dense = window.devicePixelRatio >= 1.5
  const w = phone ? 640 : 1200
  return url(phone ? mobileSrc(x) : x.media.url, dense ? w * 2 : w, dense ? 70 : 80)
}
async function preload() {
  for (let k = 0; k < n.value; k++) {
    const x = props.slides[(i.value + k) % n.value]
    if (!x?.media?.url || ready.value.has(x.id)) continue
    const pic = new Image()
    pic.src = shownUrl(x)
    try { await pic.decode() } catch { /* a broken picture must not stop the carousel */ }
    ready.value = new Set(ready.value).add(x.id)
  }
}
const first = props.slides[0]
if (first?.media?.url) {
  useHead({
    link: [
      { rel: 'preload', as: 'image', fetchpriority: 'high', media: '(min-width: 640px)', imagesrcset: set(first.media.url, 1200) },
      { rel: 'preload', as: 'image', fetchpriority: 'high', media: '(max-width: 639px)', imagesrcset: set(mobileSrc(first), 640) }
    ]
  })
}
// WEB-12: phone box ratio = the first slide's phone picture, clamped 4:5 … 3:1 (pictures cover it, so no bands).
const mobileRatio = computed(() => {
  const m = props.slides[0] && (props.slides[0].mobile_media ?? props.slides[0].media)
  const r = m?.width && m?.height ? m.width / m.height : 16 / 9
  return Math.min(3, Math.max(4 / 5, r)).toFixed(4)
})

onMounted(() => {
  preload()
  if (!reduced()) schedule()
})
onBeforeUnmount(() => { clearTimeout(timer); clearTimeout(endTimer) })

// ---------------------------------------------------------------- drag / swipe (the strip follows the pointer)
let sx = 0, sy = 0, active = false, dragging = false
const width = () => box.value?.clientWidth ?? 600
function swipeStart(e: PointerEvent) { if (loop.value && !animating.value) { active = true; dragging = false; sx = e.clientX; sy = e.clientY } }
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
  moveTo(Math.abs(dx) >= Math.min(80, width() * 0.18) ? pos.value + (dx < 0 ? 1 : -1) : pos.value)
}
function swipeCancel() { if (dragging) moveTo(pos.value); active = false; dragging = false }

const sizeFinder = useSizeFinder()
const href = (x: Slide) => (x.link_type === 'category' ? `/shop/${x.link_value}` : x.link_type === 'product' ? `/product/${x.link_value}` : x.link_value || '/shop/new')
const isCurrent = (k: number) => k === i.value
</script>

<template>
  <section v-if="s" class="grid gap-y-6 bg-bg py-6 md:min-h-[520px] md:py-8 lg:grid-cols-[5fr_7fr] lg:items-stretch lg:py-10" aria-roledescription="carousel" aria-label="Featured" @mouseenter="paused = true" @mouseleave="paused = false" @focusin="paused = true" @focusout="paused = false">
    <!-- Text column. Every slide's text is rendered in the same grid cell and only the current one is shown, so the
         column keeps the height of the tallest slide and nothing below it moves when slides change. -->
    <div class="order-2 flex flex-col justify-between gap-8 px-5 md:px-10 lg:order-1 lg:pl-[max(40px,calc((100vw-1320px)/2+40px))] lg:pr-[72px]">
      <div class="grid" aria-live="polite">
        <div v-for="(x, k) in slides" :key="`e${x.id}`" class="hero-txt [grid-area:1/1]" :class="isCurrent(k) ? 'is-on' : ''" :aria-hidden="!isCurrent(k) || undefined"><div v-if="x.eyebrow" class="eyebrow">{{ x.eyebrow }}</div></div>
      </div>
      <div class="flex flex-1 flex-col justify-center gap-6">
        <div class="grid">
          <div v-for="(x, k) in slides" :key="`h${x.id}`" class="hero-txt flex flex-col gap-5 [grid-area:1/1]" :class="isCurrent(k) ? 'is-on' : ''" :aria-hidden="!isCurrent(k) || undefined">
            <component :is="k === 0 ? 'h1' : 'h2'" class="h-display max-w-[520px]">{{ x.heading }}</component>
            <p v-if="x.subtext" class="max-w-[430px] text-[17px] leading-[1.6] text-body">{{ x.subtext }}</p>
          </div>
        </div>
        <div class="grid">
          <div v-for="(x, k) in slides" :key="`c${x.id}`" class="hero-txt flex flex-wrap gap-4 [grid-area:1/1]" :class="isCurrent(k) ? 'is-on' : ''" :inert="!isCurrent(k) || undefined" :aria-hidden="!isCurrent(k) || undefined">
            <NuxtLink v-if="x.button_label" :to="href(x)" class="btn" data-track="hero_cta">{{ x.button_label }}</NuxtLink>
            <button type="button" class="btn-o" aria-haspopup="dialog" data-track="hero_find_size" @click="sizeFinder.show()">Find your size</button>
          </div>
        </div>
      </div>
      <!-- Slide controls close the column, so their bottom edge is the picture's bottom edge. -->
      <div v-if="n > 1" class="flex flex-wrap items-center gap-x-3.5 gap-y-1">
        <button class="arrow-btn" aria-label="Previous slide" @click="slide(-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button class="arrow-btn" aria-label="Next slide" @click="slide(1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
        <div class="ml-1 flex flex-wrap items-center"><button v-for="(x, k) in slides" :key="x.id" class="flex h-11 min-w-touch items-center justify-center" :aria-label="`Go to slide ${k + 1}`" :aria-current="k === i" @click="go(k)"><span class="block h-[3px] transition-all duration-500" :class="k === i ? 'w-9 bg-primary' : 'w-5 bg-field'" /></button></div>
      </div>
    </div>

    <!-- Picture column: one strip of slides, moved as a whole -->
    <div class="order-1 px-4 sm:h-[400px] md:px-6 lg:order-2 lg:h-auto lg:pl-0 lg:pr-[max(40px,calc((100vw-1320px)/2+40px))]">
      <div ref="box" class="hero-box relative cursor-grab touch-pan-y select-none overflow-hidden rounded-[5px] bg-cream active:cursor-grabbing" :style="{ '--hero-ratio': mobileRatio }" @pointerdown="swipeStart" @pointermove="swipeMove" @pointerup="swipeEnd" @pointercancel="swipeCancel" @dragstart.prevent>
        <div class="hero-track flex h-full will-change-transform" :class="animating ? 'is-moving' : ''" :style="{ transform: `translate3d(calc(${-pos * 100}% + ${dragX}px), 0, 0)` }" @transitionend.self="settle">
          <div v-for="(x, k) in track" :key="`${k}-${x.id}`" class="relative h-full w-full flex-none" :aria-hidden="(loop ? k - 1 : k) !== i || undefined">
            <picture v-if="x.media?.url">
              <source media="(max-width: 639px)" :srcset="set(mobileSrc(x), 640)">
              <img :srcset="set(x.media.url, 1200)" :src="url(x.media.url, 1200, 80)" :alt="(loop ? k - 1 : k) === i ? x.media.alt_text || x.heading : ''" draggable="false" decoding="async" :loading="k <= 2 ? 'eager' : 'lazy'" :fetchpriority="(loop ? k === 1 : k === 0) ? 'high' : undefined" class="absolute inset-0 h-full w-full object-cover transition-opacity duration-500" :class="(loop ? k === 1 : k === 0) || isReady(x) ? 'opacity-100' : 'opacity-0'">
            </picture>
            <StoreTile v-else src="" ratio="auto" tint="bg-tile-1" class="h-full !aspect-auto" art-width="380px" category="bras" />
          </div>
        </div>
        <div class="pointer-events-none absolute bottom-3 right-3 bg-bg/80 px-3 py-1.5 text-xs uppercase tracking-[0.18em] text-ink backdrop-blur-sm md:bottom-5 md:right-5">{{ i + 1 }} / {{ n }}</div>
      </div>
    </div>
  </section>
</template>

<style scoped>
/* WEB-12 (v1.11): phones: the box has the pictures' own shape; from 640 px the column's fixed height. Pictures cover. */
.hero-box { aspect-ratio: var(--hero-ratio); }
@media (min-width: 640px) { .hero-box { aspect-ratio: auto; height: 100%; } }
/* One eased glide, like the reference slider (no linear snap, no bounce). */
.hero-track.is-moving { transition: transform 0.7s cubic-bezier(0.25, 1, 0.5, 1); }
/* Text cross-fade: the outgoing text fades quickly, the incoming one rises in a moment later. */
.hero-txt { opacity: 0; visibility: hidden; transform: translateY(8px); transition: opacity 0.3s ease, transform 0.3s ease, visibility 0s linear 0.3s; }
.hero-txt.is-on { opacity: 1; visibility: visible; transform: none; transition: opacity 0.55s ease 0.15s, transform 0.55s cubic-bezier(0.2, 0.8, 0.2, 1) 0.15s, visibility 0s; }
@media (prefers-reduced-motion: reduce) { .hero-track.is-moving, .hero-txt, .hero-txt.is-on { transition: none; } }
</style>
