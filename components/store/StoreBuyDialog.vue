<script setup lang="ts">
// SRS v1.11 CAT-12: compact product dialog opened by a card's "Buy" button (interaction modelled on the owner's reference).
// Photo, name, price, colour tiles (the colour's own photo when one is tagged, else a swatch), size chips (sold-out sizes
// struck through), size guide, quantity, then two actions with icons: Add to Bag (adds, confirms, closes) and Checkout Now
// (adds, opens /checkout with the whole bag). Both stay disabled until every required option is chosen.
// Phones: bottom sheet with the actions pinned at the bottom. Wider screens: centred two-column card.
// Dialog behaviour (Esc, backdrop, focus trap and return, scroll lock) comes from StoreDialog.
import type { CardProduct, ProductDetail } from '~/types/api'
import { MAX_QTY } from '~/utils/cart'

const props = defineProps<{ product: CardProduct }>()
const emit = defineEmits<{ close: [] }>()
const { api } = useApi()
const cart = useCartStore()
const sizeFinder = useSizeFinder()

const p = computed(() => props.product)
const variants = computed(() => p.value.variants)
// Full product (colour photos, stock hints) loads in the background; the card data is enough to choose and buy.
const detail = ref<ProductDetail | null>(null)
onMounted(async () => { detail.value = await api<ProductDetail>(`/products/${p.value.slug}/`).catch(() => null) })

const st = reactive(initialState(variants.value, p.value.image?.color))
const colours = computed(() => coloursOf(variants.value))
const sizes = computed(() => (st.colour || colours.value.length === 1 ? sizesOf(variants.value, st.colour || colours.value[0]!) : []))
const showSizes = computed(() => needsSize(variants.value, st.colour || colours.value[0] || ''))
const chosen = computed(() => chosenVariant(variants.value, st))
const hint = computed(() => missing(variants.value, st))
const qty = ref(1)
const busy = ref(false)
const live = ref('')
const full = ref(false)

function pickColour(c: string) {
  st.colour = c
  const left = sizesOf(variants.value, c).filter((s) => !s.disabled)
  if (!left.some((s) => s.label === st.size)) st.size = left.length === 1 ? left[0]!.label : ''
}
const hexOf = (c: string) => p.value.colors.find((x) => x.name.toLowerCase() === c.toLowerCase())?.hex || 'transparent'
const photoOf = (c: string) => detail.value?.images.find((i) => i.color && i.color.toLowerCase() === c.toLowerCase()) ?? null
const colourOut = (c: string) => !variants.value.some((v) => v.color_name === c && v.in_stock)
const photo = computed(() => (st.colour && photoOf(st.colour)) || p.value.image)
const price = computed(() => chosen.value?.price ?? p.value.price)
const stockNote = computed(() => {
  const v = chosen.value && detail.value?.variants.find((x) => x.id === chosen.value!.id)
  return v?.low_stock_left ? `Only ${v.low_stock_left} left` : ''
})
const maxQty = computed(() => {
  const v = chosen.value && detail.value?.variants.find((x) => x.id === chosen.value!.id)
  return Math.max(1, Math.min(MAX_QTY, v?.low_stock_left || MAX_QTY))
})
watch(maxQty, (m) => { if (qty.value > m) qty.value = m })

function addToBag(): boolean {
  const v = chosen.value
  if (!v) return false
  const status = cart.add(lineFor(p.value, v), qty.value)
  if (status === 'full') { full.value = true; live.value = 'Your bag is full. Remove an item to add this one.'; return false }
  const t = useTrack()
  t.ecommerce('add_to_cart', { items: [t.item(p.value, { price: Number(v.price ?? p.value.price), quantity: qty.value, item_variant: [v.color_name, v.size_label].filter(Boolean).join(' / ') || undefined })] })
  return true
}
const buy = useBuyDialog()
function onAdd() {
  if (!addToBag()) return
  buy.markAdded(p.value.id) // the card confirms "Added to bag ✓" once the dialog has closed
  emit('close')
}
async function onCheckout() {
  if (!addToBag()) return
  busy.value = true
  emit('close')
  await navigateTo('/checkout')
}
// The size chart opens on top; when it closes, keep this dialog's page scroll lock.
watch(sizeFinder.open, (o) => { if (!o) document.documentElement.style.overflow = 'hidden' })
</script>

<template>
  <StoreDialog labelledby="buy-title" overlay-class="items-end sm:items-center sm:p-6" panel-class="buy-in flex max-h-[92dvh] w-full max-w-[760px] flex-col overflow-hidden rounded-t-[20px] bg-bg shadow-pop sm:max-h-[88vh] sm:rounded-[16px]" @close="emit('close')">
    <div class="mx-auto mt-2.5 h-1 w-10 flex-none rounded-full bg-field sm:hidden" aria-hidden="true" />
    <div class="grid min-h-0 flex-1 overflow-y-auto overscroll-contain sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <!-- Photo with zoom (v1.11 owner request; CAT-27 behaviour): +/−, pinch, Ctrl/⌘ + wheel, double-tap.
           Wider screens: a column beside the options; phones: below the name, whole photo shown (contain). -->
      <div class="hidden self-start bg-cream sm:block">
        <StoreProductZoom :src="photo?.url" :alt="photo?.alt_text || p.name" :tile-key="p.id" :category="p.category.slug" ratio="3/4" fit="contain" compact />
      </div>

      <div class="flex flex-col gap-5 px-5 pb-5 pt-3 sm:px-7 sm:pt-6">
        <div class="flex items-start gap-3.5">
          <div class="min-w-0 flex-1">
            <div class="text-xs uppercase tracking-[0.16em] text-muted">{{ p.subcategory?.name || p.category.name }}</div>
            <h2 id="buy-title" class="mt-1 font-display text-[22px] font-medium leading-[1.15] md:text-[26px]">{{ p.name }}</h2>
            <div class="mt-1.5 flex items-baseline gap-2.5"><span class="text-[17px] font-medium">{{ taka(price) }}</span><s v-if="p.discount_pct" class="text-sm text-muted">{{ taka(p.compare_at_price) }}</s><span v-if="p.discount_pct" class="bg-accent px-1.5 py-0.5 text-[11px] font-semibold text-primary-contrast">−{{ p.discount_pct }}%</span></div>
          </div>
          <button type="button" class="-mr-2 -mt-1 flex h-11 w-11 flex-none items-center justify-center rounded-full transition-colors hover:bg-cream" aria-label="Close" data-autofocus @click="emit('close')"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg></button>
        </div>
        <StoreProductZoom :src="photo?.url" :alt="photo?.alt_text || p.name" :tile-key="p.id" :category="p.category.slug" ratio="4/3" fit="contain" compact class="-mx-5 bg-cream sm:hidden" />

        <!-- Colour -->
        <fieldset v-if="colours.length > 1 || colours[0]" class="flex flex-col gap-2.5">
          <legend class="mb-2.5 text-xs font-medium uppercase tracking-[0.16em]">Colour <span v-if="colours.length > 1" class="text-accent" aria-hidden="true">*</span><span v-if="st.colour" class="ml-2 font-normal normal-case tracking-normal text-muted">{{ st.colour }}</span></legend>
          <div class="flex flex-wrap gap-2.5">
            <button
              v-for="c in colours" :key="c" type="button" :aria-pressed="st.colour === c" :aria-label="colourOut(c) ? `${c}, sold out` : c" :disabled="colourOut(c)"
              class="group/c relative flex flex-col items-center gap-1 rounded-[8px] border p-1 transition-[border-color,box-shadow] duration-200 disabled:cursor-not-allowed disabled:opacity-45"
              :class="st.colour === c ? 'border-ink shadow-[0_0_0_1px_var(--color-ink)]' : 'border-border hover:border-field'" @click="pickColour(c)"
            >
              <StoreTile v-if="photoOf(c)" :src="photoOf(c)!.url" alt="" :tile-key="p.id" ratio="3/4" :width="56" :height="75" class="w-12 rounded-[5px] sm:w-14" />
              <span v-else class="flex h-12 w-12 items-center justify-center sm:h-14 sm:w-14"><span class="block h-8 w-8 rounded-full border border-ink/20" :style="{ backgroundColor: hexOf(c) }" /></span>
              <span class="max-w-[64px] truncate text-[11.5px] leading-tight text-body">{{ c }}</span>
              <span v-if="colourOut(c)" class="pointer-events-none absolute inset-x-1 top-1/2 h-px -rotate-12 bg-muted" aria-hidden="true" />
            </button>
          </div>
        </fieldset>

        <!-- Size -->
        <fieldset v-if="showSizes" class="flex flex-col">
          <legend class="mb-2.5 flex w-full items-center justify-between gap-3 text-xs font-medium uppercase tracking-[0.16em]">
            <span>Size <span class="text-accent" aria-hidden="true">*</span><span v-if="st.size" class="ml-2 font-normal normal-case tracking-normal text-muted">{{ st.size }}</span></span>
            <button type="button" class="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border px-3 font-normal normal-case tracking-normal text-body transition-colors hover:border-ink hover:text-ink" @click="sizeFinder.show()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M3 8h18v8H3zM7 8v3M11 8v4M15 8v3M19 8v4" /></svg>Size guide
            </button>
          </legend>
          <p v-if="!sizes.length" class="text-sm text-muted">Pick a colour first.</p>
          <div v-else class="flex flex-wrap gap-2">
            <button v-for="s in sizes" :key="s.variant.id" type="button" class="chip-size h-11 min-w-[52px] border px-3 text-sm transition-colors disabled:cursor-not-allowed disabled:line-through disabled:opacity-40" :class="st.size === s.label ? 'border-ink bg-ink text-bg' : 'border-field hover:border-ink'" :disabled="s.disabled" :aria-pressed="st.size === s.label" :aria-label="s.disabled ? `${s.label}, sold out` : s.label" @click="st.size = s.label">{{ s.label }}</button>
          </div>
        </fieldset>

        <!-- Quantity -->
        <div class="flex items-center justify-between gap-4">
          <span class="text-xs font-medium uppercase tracking-[0.16em]">Quantity</span>
          <div class="flex items-center gap-3">
            <span v-if="stockNote" class="text-[13px] text-rose-deep">{{ stockNote }}</span>
            <div class="flex h-11 items-center border border-field">
              <button type="button" class="flex h-full w-11 items-center justify-center disabled:text-muted" :disabled="qty <= 1" aria-label="Decrease quantity" @click="qty--"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M5 12h14" /></svg></button>
              <span class="w-8 text-center tabular-nums" aria-live="polite">{{ qty }}</span>
              <button type="button" class="flex h-full w-11 items-center justify-center disabled:text-muted" :disabled="qty >= maxQty" aria-label="Increase quantity" @click="qty++"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg></button>
            </div>
          </div>
        </div>
        <NuxtLink :to="`/product/${p.slug}`" class="lnk self-start text-sm" @click="emit('close')">View full details</NuxtLink>
      </div>
    </div>

    <!-- Actions: pinned to the bottom of the sheet -->
    <div class="flex-none border-t border-border bg-bg px-5 pb-[calc(16px+env(safe-area-inset-bottom))] pt-3.5 sm:px-7 sm:pb-5">
      <p class="mb-2.5 min-h-[18px] text-center text-[13px] font-medium text-rose-deep" role="status">{{ full ? live : hint }}</p>
      <div class="grid grid-cols-2 gap-2.5">
        <button type="button" class="btn flex !h-[52px] items-center justify-center gap-2 whitespace-nowrap !px-2 !text-[11.5px] !tracking-[0.1em] sm:!text-xs sm:!tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-45" :disabled="!chosen || busy" data-track="buy_checkout_now" @click="onCheckout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><!-- cart with an arrow: "go to checkout" -->
            <path d="M2.5 4h2.3l2.4 11.3a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.1L21 7.5H5.6" stroke-linejoin="round" /><path d="M9.5 11.5h6.5M13.8 9.2l2.2 2.3-2.2 2.3" stroke-linecap="round" stroke-linejoin="round" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17.5" cy="20" r="1.3" /></svg>
          <span>Checkout Now</span>
        </button>
        <button type="button" class="btn-o flex !h-[52px] items-center justify-center gap-2 whitespace-nowrap !px-2 !text-[11.5px] !tracking-[0.1em] sm:!text-xs sm:!tracking-[0.14em] disabled:cursor-not-allowed disabled:opacity-45" :disabled="!chosen || busy" data-track="buy_add_to_cart" @click="onAdd">
          <!-- bag with a plus: "add to bag" -->
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round" aria-hidden="true"><path d="M5 8h14l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H7.7a1.5 1.5 0 0 1-1.5-1.3z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /><path d="M12 11.5v6M9 14.5h6" /></svg>
          <span>Add to Bag</span>
        </button>
      </div>
    </div>
  </StoreDialog>
</template>

<style>
@media (prefers-reduced-motion: no-preference) {
  .buy-in { animation: sll-buy-up 0.34s cubic-bezier(0.2, 0.8, 0.2, 1); }
  @media (min-width: 640px) { .buy-in { animation-name: sll-buy-pop; } }
  @keyframes sll-buy-up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }
  @keyframes sll-buy-pop { from { transform: translateY(12px) scale(0.98); opacity: 0; } to { transform: none; opacity: 1; } }
}
</style>
