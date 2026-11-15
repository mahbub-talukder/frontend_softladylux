<script setup lang="ts">
// Shop by category. Original layout (6 tiles in view on desktop, square arrows beside the heading, peeking tiles on
// phones) plus SRS WEB-03 (amendment v1.6):
// - Autoplay: moves right-to-left one tile every 3 s in an endless loop. When the tiles overflow, the list is rendered
//   twice (the copy is aria-hidden and not tabbable); past the copy's start the rail jumps back by exactly one set,
//   which looks identical.
// - Mouse drag with flick momentum (touch keeps the browser's native swipe). A drag never counts as a click.
// - Pauses on hover, keyboard focus, touch/drag and a hidden tab; no autoplay for reduced-motion visitors.
import type { Home } from '~/types/api'

const props = defineProps<{ categories: Home['categories'] }>()
const INTERVAL = 3000 // WEB-03 (v1.6)

const rail = ref<HTMLElement | null>(null)
const loop = ref(false)
const canPrev = ref(false)
const canNext = ref(true)
const items = computed(() => (loop.value ? [...props.categories, ...props.categories] : props.categories))
const hovered = ref(false)
const focused = ref(false)
const dragging = ref(false)
let pauseUntil = 0
const pauseFor = (ms: number) => { pauseUntil = Math.max(pauseUntil, Date.now() + ms) }
let timer: ReturnType<typeof setInterval> | undefined
let settle: ReturnType<typeof setTimeout> | undefined
let raf = 0

const tiles = () => Array.from(rail.value?.children ?? []) as HTMLElement[]
/** One tile plus the gap: one autoplay / arrow step. */
function step() {
  const [a, b] = tiles()
  return a && b ? b.offsetLeft - a.offsetLeft : (a?.offsetWidth ?? 0)
}
/** First tile to first tile of the copy (= one full set); 0 when not looping. */
function setWidth() {
  const t = tiles()
  const n = props.categories.length
  return loop.value && t[n] && t[0] ? t[n].offsetLeft - t[0].offsetLeft : 0
}
const jump = (left: number) => rail.value?.scrollTo({ left, behavior: 'instant' as ScrollBehavior })
/** Keep the position inside the first set during a drag or glide (invisible: both sets look the same). */
function wrap(): number {
  const el = rail.value
  const w = setWidth()
  if (!el || !w) return 0
  if (el.scrollLeft >= w) { el.scrollLeft -= w; return -w }
  if (el.scrollLeft <= 0) { el.scrollLeft += w; return w }
  return 0
}
function measureEnds() {
  const el = rail.value
  if (!el) return
  canPrev.value = loop.value || el.scrollLeft > 4
  canNext.value = loop.value || el.scrollLeft + el.clientWidth < el.scrollWidth - 4
}

function move(dir: 1 | -1) {
  const el = rail.value
  if (!el) return
  const w = setWidth()
  if (w) {
    if (dir === 1 && el.scrollLeft >= w - 2) jump(el.scrollLeft - w)
    if (dir === -1 && el.scrollLeft <= 2) jump(el.scrollLeft + w)
  }
  el.scrollBy({ left: dir * step(), behavior: 'smooth' })
}
function arrow(dir: 1 | -1) { pauseFor(INTERVAL * 2); move(dir) }

function onScroll() {
  measureEnds()
  if (dragging.value || raf) return
  clearTimeout(settle) // after a swipe or smooth scroll ends past the seam, quietly move back by one set
  settle = setTimeout(() => { const el = rail.value; const w = setWidth(); if (el && w && el.scrollLeft >= w - 2) jump(el.scrollLeft - w) }, 150)
}

// ---- mouse drag + momentum (pointerType "mouse" only; touch and pen use native scrolling)
let startX = 0
let startLeft = 0
let lastX = 0
let lastT = 0
let velocity = 0 // px per ms, positive = content moving left
let moved = false
function onDown(e: PointerEvent) {
  const el = rail.value
  if (e.pointerType !== 'mouse' || e.button !== 0 || !el) return
  cancelAnimationFrame(raf); raf = 0
  dragging.value = true; moved = false
  startX = lastX = e.clientX; startLeft = el.scrollLeft; lastT = performance.now(); velocity = 0
  el.style.scrollSnapType = 'none' // free movement while dragging; snapped again at the end
}
function onMove(e: PointerEvent) {
  const el = rail.value
  if (!dragging.value || !el) return
  const dx = e.clientX - startX
  if (!moved && Math.abs(dx) > 5) { moved = true; el.setPointerCapture?.(e.pointerId) }
  if (!moved) return
  el.scrollLeft = startLeft - dx
  startLeft += wrap()
  const now = performance.now()
  const dt = Math.max(1, now - lastT)
  velocity = 0.8 * ((lastX - e.clientX) / dt) + 0.2 * velocity
  lastX = e.clientX; lastT = now
}
function onUp(e: PointerEvent) {
  const el = rail.value
  if (!dragging.value || !el) return
  if (el.hasPointerCapture?.(e.pointerId)) el.releasePointerCapture(e.pointerId)
  dragging.value = false
  pauseFor(INTERVAL * 2)
  if (!moved) { el.style.scrollSnapType = ''; return }
  if (performance.now() - lastT > 80) velocity = 0 // held still before letting go: no flick
  let v = velocity * 16 // px per frame
  const glide = () => {
    v *= 0.94
    el.scrollLeft += v
    wrap()
    if (Math.abs(v) > 0.5) { raf = requestAnimationFrame(glide); return }
    raf = 0
    const s = step() // land on the nearest tile, then hand back to scroll-snap
    if (s) el.scrollTo({ left: Math.round(el.scrollLeft / s) * s, behavior: 'smooth' })
    setTimeout(() => { el.style.scrollSnapType = '' }, 350)
  }
  raf = requestAnimationFrame(glide)
}
/** A drag must not open the tile it started on. */
function onClickCapture(e: MouseEvent) { if (moved) { e.preventDefault(); e.stopPropagation(); moved = false } }

/** Turn the loop on only when one set overflows the rail (measured without the copy). */
async function measure() {
  loop.value = false
  await nextTick()
  const el = rail.value
  if (el) loop.value = el.scrollWidth > el.clientWidth + 4
  await nextTick()
  measureEnds()
}
const reduced = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
let resizeTimer: ReturnType<typeof setTimeout> | undefined
const onResize = () => { clearTimeout(resizeTimer); resizeTimer = setTimeout(measure, 200) }

onMounted(() => {
  measure()
  window.addEventListener('resize', onResize)
  if (reduced()) return
  timer = setInterval(() => {
    if (loop.value && !hovered.value && !focused.value && !dragging.value && !raf && Date.now() > pauseUntil && !document.hidden) move(1)
  }, INTERVAL)
})
onBeforeUnmount(() => {
  clearInterval(timer); clearTimeout(settle); clearTimeout(resizeTimer); cancelAnimationFrame(raf)
  window.removeEventListener('resize', onResize)
})
watch(() => props.categories.length, measure)
</script>

<template>
  <div @mouseenter="hovered = true" @mouseleave="hovered = false" @focusin="focused = true" @focusout="focused = false">
    <StoreSection eyebrow="Shop by category" title="The wardrobe, edited">
      <div class="hidden gap-2.5 md:flex">
        <button class="arrow-btn" aria-label="Previous categories" :disabled="!canPrev" data-track="home_category_prev" @click="arrow(-1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg></button>
        <button class="arrow-btn" aria-label="Next categories" :disabled="!canNext" data-track="home_category_next" @click="arrow(1)"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg></button>
      </div>
    </StoreSection>
    <ul
      ref="rail" role="region" aria-roledescription="carousel" aria-label="Shop by category"
      class="-mx-5 flex snap-x snap-mandatory scroll-px-5 gap-5 overflow-x-auto px-5 pb-2 [scrollbar-width:none] md:mx-0 md:scroll-px-0 md:px-0 [&::-webkit-scrollbar]:hidden"
      :class="dragging ? 'cursor-grabbing select-none' : 'md:cursor-grab'"
      @scroll.passive="onScroll" @touchstart.passive="pauseFor(6000)" @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp"
      @click.capture="onClickCapture" @dragstart.prevent
    >
      <li v-for="(c, k) in items" :key="`${k}-${c.slug}`" class="w-[44%] shrink-0 snap-start sm:w-[30%] lg:w-[calc((100%-100px)/6)]" :aria-hidden="k >= categories.length ? 'true' : undefined">
        <NuxtLink :to="`/shop/${c.slug}`" class="group flex flex-col gap-3.5 transition-transform duration-500 hover:-translate-y-1" :tabindex="k >= categories.length ? -1 : undefined" data-track="home_category_tile">
          <StoreTile :src="c.tile?.url" :alt="c.tile?.alt_text || c.name" ratio="4/5" :tile-key="k % categories.length" :category="c.slug" :width="400" :height="500" art-width="62%" />
          <div class="flex items-baseline justify-between"><h3 class="text-card md:text-2xl">{{ c.name }}</h3><span class="text-xs font-medium uppercase tracking-[0.16em] underline underline-offset-[6px]">Shop</span></div>
        </NuxtLink>
      </li>
    </ul>
  </div>
</template>
