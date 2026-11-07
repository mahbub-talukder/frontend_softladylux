<script setup lang="ts">
// Design: ProductCard board. 3:4 tile (photo, or tinted tile + line art), tag and discount badges,
// wishlist heart, a Quick add control, then category label, serif name, price with strike-through and
// colour dots. SRS CAT-05 (badge), CAT-12 (Quick Add), CAT-13 (sold out stays visible, disabled), UI-02
// (44 px targets), UI-05 (no layout shift).
// Quick add (Task 10): state is explicit (idle | picking | added, see useQuickAdd). Hover only *reveals*
// the bar in CSS; it never changes state. One click/tap opens the size chips, which stay open until a
// size is chosen, a pointerdown lands outside, Escape is pressed or focus leaves the card. Touch screens
// get an always-visible "Quick add" button under the photo.
import type { CardProduct } from '~/types/api'

const props = defineProps<{ product: CardProduct }>()
const p = computed(() => props.product)
const cart = useCartStore()
const root = ref<HTMLElement | null>(null)
const state = ref<QuickAddState>('idle')
const full = ref(false)
const live = ref('')
let timer: ReturnType<typeof setTimeout> | undefined

const uid = useId()
const panelId = `qa-${uid}`
const plan = computed(() => planFor(p.value.variants))
const colours = computed(() => colourNames(p.value.variants).filter(Boolean))
const colour = ref(defaultColour(p.value.variants, p.value.image?.color))
const chips = computed(() => chipsFor(p.value.variants, colour.value))
const picking = computed(() => state.value === 'picking')
const label = computed(() => (full.value ? 'Your bag is full' : state.value === 'added' ? 'Added to bag ✓' : 'Quick add'))

function send(e: QuickAddEvent) { state.value = nextState(state.value, e) }

// The visible trigger (the hover bar on mouse devices, the button under the photo on touch).
const trigger = () => [...(root.value?.querySelectorAll<HTMLElement>('[data-qa-trigger]') ?? [])].find((el) => el.offsetParent !== null)
async function focusTrigger() { await nextTick(); trigger()?.focus() }

async function toggle() {
  if (plan.value.mode === 'none') return
  if (plan.value.mode === 'direct') return add(plan.value.variant)
  send('toggle')
  if (picking.value) {
    await nextTick()
    const panel = root.value?.querySelector<HTMLElement>("[data-qa-panel]")
    ;(panel?.querySelector<HTMLElement>('[data-chip]:not(:disabled)') ?? panel)?.focus()
  }
}

function add(v: CardVariant) {
  full.value = cart.add(lineFor(p.value, v), 1) === 'full'
  if (!full.value) useTrack().push('add_to_cart', { items: [useTrack().item(p.value)] })
  send('chosen')
  live.value = full.value ? 'Your bag is full' : `Added ${p.value.name}, ${[v.color_name, v.size_label].filter(Boolean).join(' ')} to bag`
  focusTrigger()
  clearTimeout(timer); timer = setTimeout(() => { send('reset'); full.value = false }, 1800)
}

function escape() {
  if (!picking.value) return
  send('close'); focusTrigger()
}
function onFocusOut(e: FocusEvent) {
  const to = e.relatedTarget as Node | null
  if (to && !root.value?.contains(to)) send('close')
}
function outside(e: PointerEvent) {
  if (!root.value?.contains(e.target as Node)) send('close')
}
watch(picking, (on) => {
  if (!import.meta.client) return
  if (on) document.addEventListener('pointerdown', outside, true)
  else document.removeEventListener('pointerdown', outside, true)
})
onBeforeUnmount(() => { clearTimeout(timer); if (import.meta.client) document.removeEventListener('pointerdown', outside, true) })
</script>

<template>
  <article ref="root" class="fade-in group flex w-full flex-col gap-3" @keydown.esc="escape" @focusout="onFocusOut">
    <StoreTile :src="p.image?.url" :alt="p.image?.alt_text || p.name" :tile-key="p.id" :category="p.category.slug" ratio="3/4" :sizes="'xs:50vw md:33vw lg:25vw'">
      <NuxtLink :to="`/product/${p.slug}`" class="absolute inset-0" :aria-label="p.name" />
      <div class="pointer-events-none absolute left-3.5 top-3.5 flex flex-col items-start gap-1.5">
        <span v-if="p.tag" class="bg-bg px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink">{{ p.tag }}</span>
        <span v-if="p.discount_pct" class="bg-accent px-2.5 py-1.5 text-xs font-semibold tracking-[0.06em] text-primary-contrast">−{{ p.discount_pct }}%</span>
      </div>
      <div class="absolute right-2.5 top-2.5"><StoreWishHeart :product-id="p.id" :slug="p.slug" :label="p.name" /></div>
      <template v-if="!p.sold_out">
        <!-- Size chips: open until a choice, outside pointerdown, Escape or focus leaving the card -->
        <!-- tabindex=-1: a click on the panel background keeps focus inside the card, so focusout does not close it -->
        <div v-if="picking" :id="panelId" data-qa-panel tabindex="-1" class="absolute inset-x-0 bottom-0 flex max-h-full flex-col items-center gap-1 overflow-y-auto bg-dark/95 px-1.5 py-2 text-on-dark outline-none" role="group" aria-label="Select size">
          <div v-if="colours.length > 1" class="flex flex-wrap justify-center" role="group" aria-label="Colour">
            <button v-for="c in colours" :key="c" type="button" class="inline-flex h-11 min-w-11 items-center justify-center" :aria-pressed="colour === c" :aria-label="c" @click="colour = c">
              <span class="block h-5 w-5 rounded-full border-2" :class="colour === c ? 'border-on-dark' : 'border-transparent'"><span class="block h-full w-full rounded-full border border-ink/30" :style="{ backgroundColor: p.colors.find((x) => x.name.toLowerCase() === c.toLowerCase())?.hex || 'transparent' }" /></span>
            </button>
          </div>
          <span class="text-xs font-medium uppercase tracking-[0.16em] text-champagne">Select size</span>
          <div class="flex flex-wrap justify-center gap-1">
            <button v-for="c in chips" :key="c.variant.id" type="button"  data-chip :disabled="c.disabled" :aria-label="c.disabled ? `${c.label}, sold out` : c.label" class="h-11 min-w-11 border border-text-dark-3 px-2 text-[13px] transition-colors hover:border-on-dark hover:bg-on-dark hover:text-ink disabled:cursor-not-allowed disabled:line-through disabled:opacity-40 disabled:hover:border-text-dark-3 disabled:hover:bg-transparent disabled:hover:text-inherit" @click="add(c.variant)">{{ c.label }}</button>
          </div>
        </div>
        <!-- Mouse devices: bar revealed by hover or keyboard focus (CSS only) -->
        <div v-else class="qa-bar absolute inset-x-0 bottom-0 bg-dark/95 text-on-dark">
          <button type="button" data-qa-trigger class="min-h-12 w-full px-4 text-xs font-medium uppercase tracking-[0.16em] transition-colors hover:text-champagne" :aria-expanded="false" :aria-controls="panelId" data-track="quick_add" @click="toggle">{{ label }}</button>
        </div>
      </template>
      <div v-else class="pointer-events-none absolute inset-x-0 bottom-0 bg-bg/90 py-2 text-center text-xs uppercase tracking-[0.16em]">Sold out</div>
    </StoreTile>
    <!-- Touch devices: always-visible button, no hover needed (SRS UI-02: 44 px) -->
    <button v-if="!p.sold_out" type="button" data-qa-trigger class="qa-touch h-11 w-full items-center justify-center border border-primary text-xs font-medium uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-contrast" :aria-expanded="picking" :aria-controls="panelId" data-track="quick_add" @click="toggle">{{ label }}</button>
    <span class="sr-only" role="status" aria-live="polite">{{ live }}</span>
    <div class="flex flex-col gap-1">
      <div class="text-xs uppercase tracking-[0.16em] text-muted">{{ p.subcategory?.name || p.category.name }}</div>
      <NuxtLink :to="`/product/${p.slug}`" class="-my-1.5 block py-3 font-display text-lg font-medium leading-[1.2] transition-colors hover:text-accent md:text-[19px]">{{ p.name }}</NuxtLink>
      <div class="flex items-center justify-between gap-2.5">
        <div class="flex items-baseline gap-2.5 text-[15px]"><span class="font-medium">{{ taka(p.price) }}</span><s v-if="p.discount_pct" class="text-[13.5px] text-muted">{{ taka(p.compare_at_price) }}</s></div>
        <div v-if="p.colors.length" class="flex gap-1.5" aria-label="Available colours"><span v-for="c in p.colors.slice(0, 4)" :key="c.name" :title="c.name" class="h-3 w-3 rounded-full border border-ink/30" :style="{ backgroundColor: c.hex }" /></div>
      </div>
    </div>
  </article>
</template>
