<script setup lang="ts">
// Design: Cart board (Step 1 of 3). SRS CRT-01..05, CRT-07/08/09. No account sync and no wishlist
// move here (CRT-01; wishlist arrives in M4). Delivery is estimated from the chosen area (CRT-04).
import type { Area } from '~/utils/cart'

useSeoMeta({ title: 'Shopping bag', robots: 'noindex' })
const cart = useCartStore()
const { data: s } = await useSiteSettings()
const code = ref('')
const couponMsg = computed(() => cart.check?.coupon ?? null)

onMounted(() => { code.value = cart.coupon; cart.validate() }) // CRT-03: re-validate on load
let timer: ReturnType<typeof setTimeout> | undefined
// One string key: a getter returning a fresh array fires on every re-run, and validate() itself
// replaces the lines, which made the check loop forever (the button kept flashing).
watch(() => `${cart.lines.map((l) => `${l.variant}:${l.quantity}`).join()}|${cart.area}|${cart.coupon}`, () => {
  clearTimeout(timer)
  timer = setTimeout(() => cart.validate(), 250)
})

const inside = computed(() => Number(s.value?.delivery_fee_inside_dhaka ?? 0))
const outside = computed(() => Number(s.value?.delivery_fee_outside_dhaka ?? 0))
const check = computed(() => cart.check)
const subtotal = computed(() => Number(check.value?.subtotal ?? cart.localSubtotal))
const discount = computed(() => (couponMsg.value?.valid ? Number(couponMsg.value.discount ?? 0) : 0))
const fee = computed(() => (cart.area === 'inside_dhaka' ? inside.value : cart.area === 'outside_dhaka' ? outside.value : null))
const total = computed(() => subtotal.value - discount.value + (fee.value ?? 0))
const lineInfo = (variant: number) => check.value?.lines.find((l) => l.variant === variant)
const issueText: Record<string, string> = {
  unavailable: 'No longer available', sold_out: 'Sold out', quantity_above_stock: 'Only a few left', quantity_invalid: 'Check the quantity'
}
function apply() { cart.setCoupon(code.value) }
function removeCoupon() { code.value = ''; cart.setCoupon('') }
const priceChanged = (l: { variant: number; price: string }) => {
  const c = lineInfo(l.variant)
  return !!c?.price && c.price !== l.price
}
</script>

<template>
  <section class="pb-8">
    <div class="mb-8 flex flex-col gap-3 md:mb-10"><div class="eyebrow">Step 1 of 3 · Bag</div><h1 class="font-display text-[44px] leading-none md:text-[60px]">Shopping bag</h1></div>
    <p v-if="!cart.storageOk" class="mb-6 border-l-[3px] border-gold bg-cream p-3 text-sm" role="status">Your bag could not be saved on this device (private mode or blocked storage). It works for this visit only.</p>

    <div v-if="cart.hydrated && !cart.lines.length" class="flex flex-col items-center gap-4 bg-cream px-5 py-20 text-center md:py-24">
      <h2 class="font-display text-[34px] md:text-[40px]">Your bag is empty</h2><p class="text-body">Discover something you will love.</p>
      <NuxtLink to="/" class="btn">Start shopping</NuxtLink>
    </div>

    <div v-else-if="cart.lines.length" class="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-14">
      <div class="min-w-0 flex-1">
        <p v-if="cart.checkFailed" class="err mb-3" role="alert">We couldn’t check your bag just now. <button class="underline" @click="cart.validate()">Try again</button></p>
        <div class="hidden grid-cols-[minmax(0,1fr)_140px_120px] gap-5 border-b border-ink pb-3.5 text-xs font-semibold uppercase tracking-[0.18em] md:grid"><span>Product</span><span>Quantity</span><span class="text-right">Total</span></div>
        <ul>
          <li v-for="l in cart.lines" :key="l.variant" class="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-4 border-b border-border py-6 md:grid-cols-[minmax(0,1fr)_140px_120px] md:items-center md:gap-5 md:py-[26px]">
            <div class="col-span-2 flex items-center gap-4 md:col-span-1 md:gap-[22px]">
              <NuxtLink :to="`/product/${l.slug}`" class="block w-[88px] flex-none md:w-[110px]"><StoreTile :src="l.image" :alt="l.name" :tile-key="l.variant" ratio="3/4" :width="110" :height="147" art-width="56%" /></NuxtLink>
              <div class="flex min-w-0 flex-col gap-1.5">
                <NuxtLink :to="`/product/${l.slug}`" class="font-display text-[22px] leading-[1.15] md:text-[26px]">{{ l.name }}</NuxtLink>
                <span class="text-sm text-muted">{{ l.label }}</span>
                <span class="text-[15px]">{{ taka(l.price) }}</span>
                <p v-if="priceChanged(l)" class="text-sm text-accent" role="status">The price changed to {{ taka(lineInfo(l.variant)?.price) }}.</p>
                <div v-if="cart.issuesFor(l.variant).length" class="flex flex-wrap items-center gap-2 text-sm text-accent" role="alert">
                  {{ cart.issuesFor(l.variant).map((i) => issueText[i]).join(', ') }}
                  <button class="underline" @click="cart.fix(l.variant)">{{ cart.issuesFor(l.variant).includes('quantity_above_stock') ? `Reduce to ${lineInfo(l.variant)?.available_quantity}` : 'Remove' }}</button>
                </div>
                <button class="mt-1 min-h-11 self-start border-b border-ink text-xs font-medium uppercase tracking-[0.14em]" @click="cart.remove(l.variant); useTrack().push('remove_from_cart', { item: l.slug })">Remove</button>
              </div>
            </div>
            <div class="flex h-12 w-[132px] items-center border border-field bg-surface" role="group" :aria-label="`Quantity for ${l.name}`">
              <button class="h-full w-11 text-[19px]" aria-label="Decrease quantity" @click="cart.setQty(l.variant, l.quantity - 1)">−</button>
              <span class="flex-1 text-center">{{ l.quantity }}</span>
              <button class="h-full w-11 text-[19px]" aria-label="Increase quantity" @click="cart.setQty(l.variant, l.quantity + 1)">+</button>
            </div>
            <div class="self-center text-right text-[17px] font-medium">{{ taka(Number(l.price) * l.quantity) }}</div>
          </li>
        </ul>
        <div class="mt-6 flex flex-wrap items-center justify-between gap-3.5"><NuxtLink to="/" class="lnk">← Continue shopping</NuxtLink><span class="text-[13.5px] text-muted">Your bag is saved on this device only.</span></div>
      </div>

      <aside class="flex w-full flex-col gap-[22px] bg-cream p-6 md:p-9 lg:max-w-[460px] lg:flex-1" aria-label="Order summary">
        <h2 class="font-display text-[32px]">Order summary</h2>
        <div role="group" aria-label="Delivery area" class="flex flex-col gap-2.5">
          <div class="text-xs font-semibold uppercase tracking-[0.18em]">Delivery area</div>
          <div class="grid grid-cols-2 gap-2.5">
            <button v-for="a in ([['inside_dhaka', 'Inside Dhaka', inside], ['outside_dhaka', 'Outside Dhaka', outside]] as const)" :key="a[0]" type="button" class="min-h-14 border px-3.5 py-2.5 text-left text-[15px] transition-colors" :class="cart.area === a[0] ? 'border-ink bg-surface' : 'border-field hover:border-ink'" :aria-pressed="cart.area === a[0]" @click="cart.setArea(a[0] as Area)">{{ a[1] }}<br><span class="text-[13px] text-muted">{{ taka(a[2]) }}</span></button>
          </div>
        </div>
        <div class="flex flex-col gap-2.5">
          <label for="cp" class="text-xs font-semibold uppercase tracking-[0.18em]">Coupon code</label>
          <div class="flex"><input id="cp" v-model="code" class="h-[50px] min-w-0 flex-1 border border-r-0 border-field bg-surface px-4 text-[15px] uppercase tracking-[0.08em]" placeholder="Enter code" autocomplete="off" @keyup.enter="apply"><button class="h-[50px] border border-ink bg-ink px-[22px] text-xs font-medium uppercase tracking-[0.14em] text-bg transition-colors hover:border-accent hover:bg-accent" @click="apply">Apply</button></div>
          <p v-if="couponMsg && !couponMsg.valid" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ couponMsg.error?.message }} <button class="underline" @click="removeCoupon">Remove</button></p>
          <p v-else-if="couponMsg?.valid" class="border-l-[3px] border-success bg-surface px-3.5 py-2.5 text-sm" role="status">{{ couponMsg.code }} applied. <button class="underline" @click="removeCoupon">Remove</button></p>
        </div>
        <dl class="flex flex-col gap-3 border-t border-field pt-5 text-[15.5px]">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(subtotal) }}</dd></div>
          <div v-if="discount" class="flex justify-between text-rose-deep"><dt>Discount ({{ couponMsg?.code }})</dt><dd>− {{ taka(discount) }}</dd></div>
          <div class="flex justify-between"><dt>Delivery</dt><dd class="text-muted">{{ fee !== null ? taka(fee) : `${taka(Math.min(inside, outside))} – ${taka(Math.max(inside, outside))}` }}</dd></div>
        </dl>
        <div class="flex items-baseline justify-between border-t border-ink pt-[18px]"><span class="text-xs font-semibold uppercase tracking-[0.18em]">Total</span><span class="font-display text-4xl">{{ fee !== null ? taka(total) : `from ${taka(total + Math.min(inside, outside))}` }}</span></div>
        <p v-if="cart.blocked" class="err" role="alert">Fix the highlighted items to continue.</p>
        <NuxtLink v-if="!cart.blocked && !cart.checking" to="/checkout" class="btn !h-[54px]" data-track="proceed_to_checkout">Proceed to checkout</NuxtLink>
        <button v-else class="btn !h-[54px]" disabled>{{ cart.checking ? 'Checking your bag…' : 'Proceed to checkout' }}</button>
        <p class="text-center text-[13px] text-body">Pay with <b class="font-medium">bKash</b>, <b class="font-medium">Nagad</b> or <b class="font-medium">cash on delivery</b> at the next step</p>
      </aside>
    </div>
  </section>
</template>
