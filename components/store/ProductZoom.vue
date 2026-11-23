<script setup lang="ts">
// SRS v1.11 CAT-27: zoomable main product photo.
// - + / − buttons (1× to 4×, step 0.5) and a reset button on every screen size.
// - Touch: two-finger pinch zooms around the fingers; one finger pans while zoomed. At 1× a single finger still scrolls
//   the page (touch-action: pan-y), so the gallery never traps the scroll.
// - Desktop: Ctrl/⌘ + mouse wheel zooms around the pointer (a plain wheel keeps scrolling the page); drag pans.
// - Double-tap / double-click toggles 2× at that point. Changing photo resets the zoom.
// - Only `transform` changes (GPU, no layout). A 2× sharper rendition is fetched the first time the photo is zoomed.
// `ratio` / `fit` (v1.11, Buy dialog): the box shape, and whether the photo fills it (cover) or shows whole (contain).
const props = withDefaults(defineProps<{ src?: string | null; alt: string; tileKey: number | string; category?: string; ratio?: string; fit?: 'cover' | 'contain'; compact?: boolean }>(), { src: null, category: undefined, ratio: '4/5', fit: 'cover', compact: false })

const MIN = 1
const MAX = 4
const STEP = 0.5
const box = ref<HTMLElement | null>(null)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)
const animate = ref(true)
const hiRes = ref(false) // load the sharper picture once zoom is used
const live = ref('')

const zoomed = computed(() => scale.value > 1.001)
const pct = computed(() => `${Math.round(scale.value * 100)}%`)

function size() { const r = box.value?.getBoundingClientRect(); return { w: r?.width ?? 1, h: r?.height ?? 1, x: r?.left ?? 0, y: r?.top ?? 0 } }
function clamp() {
  const { w, h } = size()
  const mx = ((scale.value - 1) * w) / 2
  const my = ((scale.value - 1) * h) / 2
  tx.value = Math.min(mx, Math.max(-mx, tx.value))
  ty.value = Math.min(my, Math.max(-my, ty.value))
}
// Zoom to `next`, keeping the picture point under (cx, cy) (viewport px) where it is. Default point: the centre.
function zoomTo(next: number, cx?: number, cy?: number) {
  const s = Math.min(MAX, Math.max(MIN, next))
  const { w, h, x, y } = size()
  const px = (cx ?? x + w / 2) - (x + w / 2)
  const py = (cy ?? y + h / 2) - (y + h / 2)
  const k = s / scale.value
  tx.value = px - (px - tx.value) * k
  ty.value = py - (py - ty.value) * k
  scale.value = s
  if (s === 1) { tx.value = 0; ty.value = 0 }
  clamp()
  if (s > 1) hiRes.value = true
  live.value = `Zoom ${Math.round(s * 100)}%`
}
const zoomIn = () => { animate.value = true; zoomTo(Math.round((scale.value + STEP) * 2) / 2) }
const zoomOut = () => { animate.value = true; zoomTo(Math.round((scale.value - STEP) * 2) / 2) }
const reset = () => { animate.value = true; zoomTo(1) }
watch(() => props.src, () => { animate.value = false; scale.value = 1; tx.value = 0; ty.value = 0 })

// ---------------------------------------------------------------- pinch (touch events: cancelable, so the page never
// scrolls or browser-zooms mid-pinch), pan and double-tap (pointer events, also covering mouse and pen)
const pts = new Map<number, { x: number; y: number }>()
let pinch: { d: number; s: number } | null = null
let pan: { x: number; y: number; tx: number; ty: number } | null = null
let lastTap = 0
const tDist = (t: TouchList) => Math.hypot(t[0]!.clientX - t[1]!.clientX, t[0]!.clientY - t[1]!.clientY)
const tMid = (t: TouchList) => ({ x: (t[0]!.clientX + t[1]!.clientX) / 2, y: (t[0]!.clientY + t[1]!.clientY) / 2 })
function tStart(e: TouchEvent) {
  if (e.touches.length === 2) { e.preventDefault(); pinch = { d: tDist(e.touches), s: scale.value }; pan = null; animate.value = false }
}
function tMove(e: TouchEvent) {
  if (pinch && e.touches.length >= 2) {
    e.preventDefault()
    const m = tMid(e.touches)
    zoomTo(pinch.s * (tDist(e.touches) / pinch.d), m.x, m.y)
  } else if (zoomed.value && e.cancelable) e.preventDefault() // one-finger pan of a zoomed photo, not the page
}
function tEnd(e: TouchEvent) {
  if (e.touches.length < 2 && pinch) { pinch = null; animate.value = true; if (scale.value < 1.05) zoomTo(1) }
}

function down(e: PointerEvent) {
  if ((e.target as HTMLElement).closest('[data-zoom-ui]')) return
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pts.size > 1) { pan = null; return } // two fingers: the touch pinch handler owns it
  {
    if (e.pointerType !== 'mouse') { // double-tap (dblclick covers the mouse)
      const now = Date.now()
      if (now - lastTap < 300) { animate.value = true; zoomTo(zoomed.value ? 1 : 2, e.clientX, e.clientY); lastTap = 0; pts.clear(); return }
      lastTap = now
    }
    if (zoomed.value) { box.value?.setPointerCapture(e.pointerId); pan = { x: e.clientX, y: e.clientY, tx: tx.value, ty: ty.value }; animate.value = false }
  }
}
function move(e: PointerEvent) {
  if (!pts.has(e.pointerId)) return
  pts.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pan && zoomed.value && pts.size === 1) {
    e.preventDefault()
    tx.value = pan.tx + (e.clientX - pan.x)
    ty.value = pan.ty + (e.clientY - pan.y)
    clamp()
  }
}
function up(e: PointerEvent) {
  pts.delete(e.pointerId)
  if (!pts.size && pan) { pan = null; animate.value = true }
}
function dbl(e: MouseEvent) { animate.value = true; zoomTo(zoomed.value ? 1 : 2, e.clientX, e.clientY) }
function wheel(e: WheelEvent) {
  if (!(e.ctrlKey || e.metaKey)) return // plain wheel scrolls the page; trackpad pinch arrives as ctrl+wheel
  e.preventDefault()
  animate.value = false
  zoomTo(scale.value * Math.exp(-e.deltaY * 0.0025), e.clientX, e.clientY)
}
function key(e: KeyboardEvent) {
  if (e.key === '+' || e.key === '=') { e.preventDefault(); zoomIn() }
  else if (e.key === '-') { e.preventDefault(); zoomOut() }
  else if (e.key === '0' || (e.key === 'Escape' && zoomed.value)) { e.preventDefault(); reset() }
}
onMounted(() => {
  const el = box.value
  el?.addEventListener('wheel', wheel, { passive: false })
  el?.addEventListener('touchstart', tStart, { passive: false })
  el?.addEventListener('touchmove', tMove, { passive: false })
  el?.addEventListener('touchend', tEnd)
  el?.addEventListener('touchcancel', tEnd)
})
onBeforeUnmount(() => {
  const el = box.value
  el?.removeEventListener('wheel', wheel)
  el?.removeEventListener('touchstart', tStart)
  el?.removeEventListener('touchmove', tMove)
  el?.removeEventListener('touchend', tEnd)
  el?.removeEventListener('touchcancel', tEnd)
})

const img = useImage()
const hiSrc = computed(() => (props.src ? img(mediaSrc(props.src), { width: 1440, format: 'webp', quality: 82 }) : ''))
</script>

<template>
  <div
    ref="box"
    class="zoom-box relative select-none overflow-hidden"
    :class="[zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in', zoomed ? 'touch-none' : 'touch-pan-y', fit === 'contain' ? 'fit-contain' : '']" :style="{ aspectRatio: ratio }"
    tabindex="0" role="group" :aria-label="`${alt}, photo. Use plus and minus to zoom.`"
    @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @dblclick="dbl" @keydown="key" @dragstart.prevent
  >
    <div class="origin-center will-change-transform" :class="animate ? 'transition-transform duration-300 ease-out' : ''" :style="{ transform: `translate3d(${tx}px, ${ty}px, 0) scale(${scale})` }">
      <StoreTile :src="src" :alt="alt" :tile-key="tileKey" :category="category" :ratio="ratio" :width="720" :height="900" sizes="xs:100vw lg:50vw" eager art-width="52%">
        <img v-if="src && hiRes" :src="hiSrc" alt="" aria-hidden="true" class="media-cover pointer-events-none absolute inset-0 h-full w-full opacity-0 transition-opacity duration-300" decoding="async" @load="($event.target as HTMLImageElement).classList.remove('opacity-0')">
      </StoreTile>
    </div>
    <slot />

    <!-- Controls: bottom right, 44 px targets, frosted so they read on any photo -->
    <div data-zoom-ui class="absolute flex" :class="compact ? 'bottom-2 right-2 scale-90 origin-bottom-right' : 'bottom-3 right-3 md:bottom-5 md:right-5'"><div class="flex items-center overflow-hidden rounded-full bg-bg/85 text-ink shadow-pop backdrop-blur-sm">
      <button type="button" class="zoom-btn" :disabled="scale <= MIN" aria-label="Zoom out" data-track="product_zoom_out" @click="zoomOut"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M5 12h14" /></svg></button>
      <span class="min-w-[46px] text-center text-xs tabular-nums text-body" aria-hidden="true">{{ pct }}</span>
      <button type="button" class="zoom-btn" :disabled="scale >= MAX" aria-label="Zoom in" data-track="product_zoom_in" @click="zoomIn"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
      <Transition enter-active-class="transition-[opacity,width] duration-200" leave-active-class="transition-[opacity,width] duration-150" enter-from-class="w-0 opacity-0" leave-to-class="w-0 opacity-0">
        <button v-if="zoomed" type="button" class="zoom-btn w-11 border-l border-border" aria-label="Reset zoom" @click="reset"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M4 9V4h5M20 15v5h-5M4 4l6 6M20 20l-6-6" /></svg></button>
      </Transition>
    </div></div>
    <p class="sr-only" aria-live="polite">{{ live }}</p>
  </div>
</template>

<style scoped>
.zoom-btn { display: flex; height: 2.75rem; width: 2.75rem; flex: none; align-items: center; justify-content: center; transition: background-color 0.2s, color 0.2s; }
.zoom-btn:hover:not(:disabled) { background-color: var(--color-cream); }
.zoom-btn:disabled { color: var(--color-muted); opacity: 0.5; cursor: default; }
.fit-contain :deep(img) { object-fit: contain; }
.zoom-box:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
</style>
