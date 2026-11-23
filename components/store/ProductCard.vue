<script setup lang="ts">
// Design: ProductCard board. 3:4 tile (photo, or tinted tile + line art), tag and discount badges,
// wishlist heart, a Buy control, then category label, serif name, price with strike-through and
// colour dots. SRS CAT-05 (badge), CAT-12, CAT-13 (sold out stays visible, disabled), UI-02
// (44 px targets), UI-05 (no layout shift).
// CAT-12 (v1.11, replaces Quick Add): a cart-icon "Buy" button opens the shared product dialog (StoreBuyDialog, rendered
// once by StoreShell) where colour, size and quantity are chosen. Mouse devices reveal it as a bar over the photo on
// hover/focus (CSS only); touch screens get an always-visible button under the photo. After "Add to Cart" the button
// reads "Added to bag ✓" for a moment.
import type { CardProduct } from '~/types/api'

const props = defineProps<{ product: CardProduct }>()
const p = computed(() => props.product)
const root = ref<HTMLElement | null>(null)
const buy = useBuyDialog()
const added = ref(false)
const live = ref('')
let timer: ReturnType<typeof setTimeout> | undefined
const canBuy = computed(() => !p.value.sold_out && p.value.variants.some((v) => v.in_stock))
watch(() => buy.added.value, (a) => {
  if (!a || a.id !== p.value.id) return
  added.value = true
  live.value = `Added ${p.value.name} to bag`
  clearTimeout(timer); timer = setTimeout(() => { added.value = false }, 1800)
})
const label = computed(() => (added.value ? 'Added to bag ✓' : 'Buy'))
function openBuy() { if (canBuy.value) buy.open(p.value) }
onBeforeUnmount(() => clearTimeout(timer))
</script>

<template>
  <article ref="root" v-reveal class="card-zoom group flex w-full flex-col gap-3">
    <StoreTile :src="p.image?.url" :alt="p.image?.alt_text || p.name" :tile-key="p.id" :category="p.category.slug" ratio="3/4" :sizes="'xs:50vw md:33vw lg:25vw'">
      <NuxtLink :to="`/product/${p.slug}`" class="absolute inset-0" :aria-label="p.name" />
      <div class="pointer-events-none absolute left-3.5 top-3.5 flex flex-col items-start gap-1.5">
        <span v-if="p.tag" class="bg-bg px-2.5 py-1.5 text-xs font-medium uppercase tracking-[0.14em] text-ink">{{ p.tag }}</span>
        <span v-if="p.discount_pct" class="bg-accent px-2.5 py-1.5 text-xs font-semibold tracking-[0.06em] text-primary-contrast">−{{ p.discount_pct }}%</span>
      </div>
      <div class="absolute right-2.5 top-2.5"><StoreWishHeart :product-id="p.id" :slug="p.slug" :label="p.name" :price="p.price" /></div>
      <template v-if="canBuy">
        <!-- Mouse devices: bar revealed by hover or keyboard focus (CSS only) -->
        <div class="qa-bar absolute inset-x-0 bottom-0 bg-dark/95 text-on-dark">
          <button type="button" class="flex min-h-12 w-full items-center justify-center gap-2 px-4 text-xs font-medium uppercase tracking-[0.16em] transition-colors hover:text-champagne" aria-haspopup="dialog" data-track="buy_open" @click="openBuy">
            <svg v-if="!added" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.1" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17.5" cy="20" r="1.3" /></svg>{{ label }}
          </button>
        </div>
      </template>
      <div v-else class="pointer-events-none absolute inset-x-0 bottom-0 bg-bg/90 py-2 text-center text-xs uppercase tracking-[0.16em]">Sold out</div>
    </StoreTile>
    <!-- Touch devices: always-visible button, no hover needed (SRS UI-02: 44 px) -->
    <button v-if="canBuy" type="button" class="qa-touch h-11 w-full items-center justify-center gap-2 border border-primary text-xs font-medium uppercase tracking-[0.16em] text-primary transition-colors hover:bg-primary hover:text-primary-contrast active:scale-[0.98]" aria-haspopup="dialog" data-track="buy_open" @click="openBuy">
      <svg v-if="!added" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 4h2.2l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.6a1.5 1.5 0 0 0 1.5-1.1L21 8H6.1" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17.5" cy="20" r="1.3" /></svg>{{ label }}
    </button>
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
