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
watch(() => [cart.lines.map((l) => `${l.variant}:${l.quantity}`).join(), cart.area, cart.coupon], () => {
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
  <section>
    <div class="cap">Step 1 of 3 · Bag</div>
    <h1 class="text-4xl">Shopping bag</h1>
    <p v-if="!cart.storageOk" class="mt-3 border border-border bg-cream p-3 text-sm" role="status">Your bag could not be saved on this device (private mode or blocked storage). It works for this visit only.</p>

    <div v-if="cart.hydrated && !cart.lines.length" class="mt-10 text-center">
      <h2 class="text-3xl">Your bag is empty</h2><p class="hint mt-1">Discover something you will love.</p>
      <NuxtLink to="/" class="btn mt-6">Start shopping</NuxtLink>
    </div>

    <div v-else-if="cart.lines.length" class="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <p v-if="cart.checkFailed" class="err mb-3" role="alert">We couldn’t check your bag just now. <button class="underline" @click="cart.validate()">Try again</button></p>
        <ul class="flex flex-col divide-y divide-border border-y border-border">
          <li v-for="l in cart.lines" :key="l.variant" class="flex gap-4 py-4">
            <NuxtLink :to="`/product/${l.slug}`" class="block w-24 shrink-0 bg-cream">
              <NuxtImg v-if="l.image" format="webp" :src="mediaSrc(l.image)" :alt="l.name" width="96" height="128" class="h-32 w-24 object-cover" />
            </NuxtLink>
            <div class="flex flex-1 flex-col gap-1">
              <NuxtLink :to="`/product/${l.slug}`" class="font-display text-xl">{{ l.name }}</NuxtLink>
              <span class="hint">{{ l.label }}</span>
              <span class="text-sm">{{ taka(l.price) }}</span>
              <p v-if="priceChanged(l)" class="text-sm text-accent" role="status">The price changed to {{ taka(lineInfo(l.variant)?.price) }}.</p>
              <div v-if="cart.issuesFor(l.variant).length" class="flex flex-wrap items-center gap-2 text-sm text-accent" role="alert">
                {{ cart.issuesFor(l.variant).map((i) => issueText[i]).join(', ') }}
                <button class="underline" @click="cart.fix(l.variant)">{{ cart.issuesFor(l.variant).includes('quantity_above_stock') ? `Reduce to ${lineInfo(l.variant)?.available_quantity}` : 'Remove' }}</button>
              </div>
              <div class="mt-auto flex items-center gap-4">
                <div class="flex items-center border border-border" role="group" :aria-label="`Quantity for ${l.name}`">
                  <button class="min-h-touch min-w-touch" aria-label="Decrease quantity" @click="cart.setQty(l.variant, l.quantity - 1)">−</button>
                  <span class="min-w-8 text-center">{{ l.quantity }}</span>
                  <button class="min-h-touch min-w-touch" aria-label="Increase quantity" @click="cart.setQty(l.variant, l.quantity + 1)">+</button>
                </div>
                <button class="hint underline" @click="cart.remove(l.variant); useTrack().push('remove_from_cart', { item: l.slug })">Remove</button>
              </div>
            </div>
            <div class="text-right">{{ taka(Number(l.price) * l.quantity) }}</div>
          </li>
        </ul>
        <NuxtLink to="/" class="hint mt-4 inline-block underline">← Continue shopping</NuxtLink>
        <p class="hint mt-1">Your bag is saved on this device only.</p>
      </div>

      <aside class="card h-fit" aria-label="Order summary">
        <h2 class="text-2xl">Order summary</h2>
        <fieldset>
          <legend class="cap">Delivery area</legend>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button v-for="a in ([['inside_dhaka', 'Inside Dhaka', inside], ['outside_dhaka', 'Outside Dhaka', outside]] as const)" :key="a[0]" type="button" class="border p-2 text-left text-sm" :class="cart.area === a[0] ? 'border-primary bg-primary-soft' : 'border-border'" :aria-pressed="cart.area === a[0]" @click="cart.setArea(a[0] as Area)">{{ a[1] }}<br><span class="hint">{{ taka(a[2]) }}</span></button>
          </div>
        </fieldset>
        <div class="fld">
          <label for="cp">Coupon code</label>
          <div class="flex gap-2"><input id="cp" v-model="code" class="inp" placeholder="Enter code" @keyup.enter="apply"><button class="btn-secondary !px-4" @click="apply">Apply</button></div>
          <p v-if="couponMsg && !couponMsg.valid" class="err" role="alert">{{ couponMsg.error?.message }} <button class="underline" @click="removeCoupon">Remove</button></p>
          <p v-else-if="couponMsg?.valid" class="hint" role="status">{{ couponMsg.code }} applied. <button class="underline" @click="removeCoupon">Remove</button></p>
        </div>
        <dl class="flex flex-col gap-2 text-sm">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(subtotal) }}</dd></div>
          <div v-if="discount" class="flex justify-between"><dt>Discount ({{ couponMsg?.code }})</dt><dd>− {{ taka(discount) }}</dd></div>
          <div class="flex justify-between"><dt>Delivery</dt><dd>{{ fee !== null ? taka(fee) : `${taka(Math.min(inside, outside))} – ${taka(Math.max(inside, outside))}` }}</dd></div>
          <div class="flex justify-between border-t border-border pt-2 text-lg font-medium"><dt>Total</dt><dd>{{ fee !== null ? taka(total) : `from ${taka(total + Math.min(inside, outside))}` }}</dd></div>
        </dl>
        <p v-if="cart.blocked" class="err" role="alert">Fix the highlighted items to continue.</p>
        <NuxtLink v-if="!cart.blocked && !cart.checking" to="/checkout" class="btn" data-track="proceed_to_checkout">Proceed to checkout</NuxtLink>
        <button v-else class="btn" disabled>{{ cart.checking ? 'Checking your bag…' : 'Proceed to checkout' }}</button>
        <p class="hint">Pay with bKash, Nagad or cash on delivery at the next step.</p>
      </aside>
    </div>
  </section>
</template>
