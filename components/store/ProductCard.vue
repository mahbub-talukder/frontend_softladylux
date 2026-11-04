<script setup lang="ts">
// Design: ProductCard board. 3:4 tile (photo, or tinted tile + line art), tag and discount badges,
// wishlist heart, a "+" square that gives way to a slide-up bar on hover (Quick add, or "Select
// size" when there are several), then category label, serif name, price with strike-through and
// colour dots. SRS CAT-05 (badge), CAT-12 (Quick Add), CAT-13 (sold out), UI-05 (no layout shift).
import type { CardProduct } from '~/types/api'
import type { CartLine } from '~/utils/cart'

const props = defineProps<{ product: CardProduct }>()
const p = computed(() => props.product)
const cart = useCartStore()
const hover = ref(false)
const picking = ref(false)
const added = ref(false)
const full = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

const options = computed(() => p.value.variants.filter((v) => v.in_stock))
const sizes = computed(() => [...new Set(options.value.map((v) => v.size_label).filter(Boolean))])
const open = computed(() => hover.value || picking.value || added.value)
const label = computed(() => {
  if (full.value) return 'Your bag is full'
  if (added.value) return 'Added to bag ✓'
  return sizes.value.length > 1 ? 'Quick add · choose size' : 'Quick add to bag'
})

function add(v: CardProduct['variants'][number]) {
  const line: CartLine = { variant: v.id, quantity: 1, addedAt: Date.now(), name: p.value.name, label: [v.color_name, v.size_label].filter(Boolean).join(' / '), sku: '', price: p.value.price, image: p.value.image?.url ?? null, slug: p.value.slug }
  full.value = cart.add(line, 1) === 'full'
  if (!full.value) useTrack().push('add_to_cart', { items: [useTrack().item(p.value)] })
  picking.value = false; added.value = true
  clearTimeout(timer); timer = setTimeout(() => { added.value = false; full.value = false }, 1800)
}
function quick() {
  if (!options.value.length) return
  if (sizes.value.length > 1) picking.value = !picking.value
  else add(options.value[0])
}
function leave() { hover.value = false; picking.value = false }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <article class="group flex w-full flex-col gap-3.5" @mouseenter="hover = true" @mouseleave="leave" @focusin="hover = true" @focusout="(e: FocusEvent) => { if (!(e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) leave() }">
    <StoreTile :src="p.image?.url" :alt="p.image?.alt_text || p.name" :tile-key="p.id" :category="p.category.slug" ratio="3/4" :sizes="'xs:50vw md:33vw lg:25vw'">
      <NuxtLink :to="`/product/${p.slug}`" class="absolute inset-0" :aria-label="p.name" />
      <div class="pointer-events-none absolute left-3.5 top-3.5 flex flex-col items-start gap-1.5">
        <span v-if="p.tag" class="bg-bg px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-[0.16em] text-ink">{{ p.tag }}</span>
        <span v-if="p.discount_pct" class="bg-accent px-2.5 py-1.5 text-[11px] font-semibold tracking-[0.08em] text-primary-contrast">−{{ p.discount_pct }}%</span>
      </div>
      <div class="absolute right-2.5 top-2.5"><StoreWishHeart :product-id="p.id" :slug="p.slug" :label="p.name" /></div>
      <template v-if="!p.sold_out">
        <button v-show="!open" type="button" class="absolute bottom-2.5 right-2.5 flex h-11 w-11 items-center justify-center border border-primary bg-bg text-ink transition-colors hover:bg-primary hover:text-primary-contrast" :aria-label="`Quick add ${p.name} to bag`" data-track="quick_add" @click="quick">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
        </button>
        <div class="absolute inset-x-0 bottom-0 bg-dark/95 text-on-dark transition-transform duration-[350ms] ease-out" :class="open ? 'translate-y-0' : 'translate-y-full'" :aria-hidden="!open">
          <div v-if="picking" class="flex flex-col items-center gap-2.5 px-2.5 py-3.5" role="group" aria-label="Select size">
            <span class="text-[10.5px] font-medium uppercase tracking-[0.18em] text-champagne">Select size</span>
            <div class="flex flex-wrap justify-center gap-1.5"><button v-for="z in sizes" :key="z" type="button" class="h-11 min-w-11 border border-text-dark-3 px-2 text-[13px] transition-colors hover:border-on-dark hover:bg-on-dark hover:text-ink" @click="add(options.find((o) => o.size_label === z)!)">{{ z }}</button></div>
          </div>
          <button v-else type="button" class="min-h-12 w-full p-[15px] text-[11.5px] font-medium uppercase tracking-[0.18em] transition-colors hover:text-champagne" :tabindex="open ? 0 : -1" data-track="quick_add" @click="quick">{{ label }}</button>
        </div>
      </template>
      <div v-else class="pointer-events-none absolute inset-x-0 bottom-0 bg-bg/90 py-2 text-center text-[11px] uppercase tracking-[0.18em]">Sold out</div>
    </StoreTile>
    <div class="flex flex-col gap-1.5">
      <div class="text-[11px] uppercase tracking-[0.18em] text-muted">{{ p.subcategory?.name || p.category.name }}</div>
      <NuxtLink :to="`/product/${p.slug}`" class="font-display text-[22px] font-medium leading-[1.2] transition-colors hover:text-accent">{{ p.name }}</NuxtLink>
      <div class="flex items-center justify-between gap-2.5">
        <div class="flex items-baseline gap-2.5 text-[15px]"><span class="font-medium">{{ taka(p.price) }}</span><s v-if="p.discount_pct" class="text-[13.5px] text-muted">{{ taka(p.compare_at_price) }}</s></div>
        <div v-if="p.colors.length" class="flex gap-1.5" aria-label="Available colours"><span v-for="c in p.colors.slice(0, 4)" :key="c.name" :title="c.name" class="h-3 w-3 rounded-full border border-ink/30" :style="{ backgroundColor: c.hex }" /></div>
      </div>
    </div>
  </article>
</template>
