<script setup lang="ts">
// Design: Checkout board. SRS CHK-01..CHK-09, CRT-03/09, §11. Guest or logged-in; the server
// recomputes every price (CHK-06) and the form keeps what the customer typed on any error (UI-06).
import type { ApiError } from '~/composables/useApi'
import type { CustomerOrder } from '~/types/api'

useSeoMeta({ title: 'Checkout', robots: 'noindex' })
const cart = useCartStore()
const { api, errorOf } = useApi()
const { data: s } = await useSiteSettings()
const { data: methods } = await useAsyncData('payment-methods', () => api<Record<string, boolean>>('/payment-methods/'))

const form = reactive({ name: '', phone: '', email: '', district: '', thana: '', address_line: '', note: '', payment_method: '', sender_number: '', trx_id: '' })
const errors = ref<Record<string, string>>({})
const message = ref('')
const busy = ref(false)
const lineProblems = ref<{ variant: number; issue: string; available?: number }[]>([])
const changedTotal = ref<string | null>(null)
// CHK-09: one key per checkout attempt; a retry of the same attempt returns the same order
const key = ref('')

onMounted(async () => {
  key.value = crypto.randomUUID()
  if (!cart.lines.length) return navigateTo('/cart')
  await cart.validate() // CRT-03: before checkout
  if (cart.blocked) return navigateTo('/cart')
  useTrack().push('begin_checkout', { value: cart.localSubtotal })
})
watch(() => [cart.area, cart.coupon], () => cart.validate())

const enabled = computed(() => (['bkash', 'nagad', 'cod'] as const).filter((m) => methods.value?.[m]))
if (!form.payment_method) form.payment_method = ''
watch(enabled, (e) => { if (!form.payment_method && e.length) form.payment_method = e[e.length - 1] === 'cod' ? 'cod' : e[0] }, { immediate: true })
const payName = computed(() => (form.payment_method === 'bkash' ? 'bKash' : 'Nagad'))
const merchant = computed(() => (form.payment_method === 'bkash' ? s.value?.bkash_number : s.value?.nagad_number))
const isMobile = computed(() => form.payment_method === 'bkash' || form.payment_method === 'nagad')

const fee = computed(() => (cart.area === 'inside_dhaka' ? Number(s.value?.delivery_fee_inside_dhaka) : cart.area === 'outside_dhaka' ? Number(s.value?.delivery_fee_outside_dhaka) : null))
const subtotal = computed(() => Number(cart.check?.subtotal ?? cart.localSubtotal))
const discount = computed(() => (cart.check?.coupon?.valid ? Number(cart.check.coupon.discount) : 0))
const total = computed(() => subtotal.value - discount.value + (fee.value ?? 0))
const issueText: Record<string, string> = { unavailable: 'is no longer available', quantity_above_stock: 'has fewer in stock than your quantity', quantity_invalid: 'has an invalid quantity', sold_out: 'is sold out' }
const nameOf = (variant: number) => cart.lines.find((l) => l.variant === variant)?.name ?? 'An item'

function fieldMsg(f: Record<string, unknown>) {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(f)) out[k] = Array.isArray(v) ? v.join(' ') : String(v)
  return out
}
async function place() {
  errors.value = {}; message.value = ''; lineProblems.value = []; busy.value = true
  if (!cart.area) { errors.value = { area: 'Choose a delivery area.' }; busy.value = false; return }
  try {
    const order = await api<CustomerOrder>('/checkout/', {
      method: 'POST', headers: { 'Idempotency-Key': key.value },
      body: { ...form, area: cart.area, coupon_code: cart.coupon || undefined, expected_total: (changedTotal.value ?? total.value.toFixed(2)), lines: cart.lines.map((l) => ({ variant: l.variant, quantity: l.quantity })) }
    })
    sessionStorage.setItem('sll_last_order', JSON.stringify(order))
    useTrack().push('purchase', { transaction_id: order.number, value: Number(order.total) })
    cart.clear() // CRT-09: the cart is cleared only after the order is created
    await navigateTo(`/order/${order.number}`)
  } catch (e) {
    const er: ApiError = errorOf(e)
    if (er.code === 'lines_unavailable') {
      lineProblems.value = (er.fields.lines as unknown as typeof lineProblems.value) ?? []
      message.value = 'Some items in your bag need attention. Nothing was charged and no order was created.'
      await cart.validate()
    } else if (er.code === 'price_changed') {
      changedTotal.value = String((er.fields as unknown as Record<string, string>).total)
      message.value = `Prices changed. Your new total is ${taka(changedTotal.value)}. Press Place order again to confirm.`
      await cart.validate()
    } else {
      errors.value = fieldMsg(er.fields); message.value = er.message
    }
  } finally { busy.value = false }
}
</script>

<template>
  <div>
    <div class="flex flex-wrap items-center justify-between gap-3 text-sm"><span class="cap">1 Bag · 2 Details &amp; payment · 3 Confirmation</span><NuxtLink to="/cart" class="underline">← Back to bag</NuxtLink></div>
    <h1 class="mt-2 text-4xl">Checkout</h1>
    <form v-if="cart.lines.length" class="mt-6 grid gap-8 lg:grid-cols-[1fr_380px]" @submit.prevent="place">
      <div class="flex flex-col gap-6">
        <section class="card">
          <h2 class="text-2xl">Contact &amp; delivery</h2>
          <p class="hint">Have an account? <NuxtLink to="/login" class="underline">Log in</NuxtLink> — or just check out as a guest.</p>
          <div class="fld"><label for="fn">Full name</label><input id="fn" v-model="form.name" class="inp" autocomplete="name" required><p v-if="errors.name" class="err">{{ errors.name }}</p></div>
          <div class="fld"><label for="ph">Mobile number</label><input id="ph" v-model="form.phone" class="inp" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" required><p v-if="errors.phone" class="err">{{ errors.phone }}</p></div>
          <div class="fld"><label for="em">Email (optional)</label><input id="em" v-model="form.email" type="email" class="inp" autocomplete="email" placeholder="name@email.com"><p v-if="errors.email" class="err">{{ errors.email }}</p></div>
          <fieldset>
            <legend class="cap">Delivery area</legend>
            <div class="mt-2 grid grid-cols-2 gap-3">
              <button v-for="a in ([['inside_dhaka', 'Inside Dhaka', s?.delivery_fee_inside_dhaka, s?.delivery_time_inside_dhaka], ['outside_dhaka', 'Outside Dhaka', s?.delivery_fee_outside_dhaka, s?.delivery_time_outside_dhaka]] as const)" :key="a[0]" type="button" class="border p-3 text-left" :class="cart.area === a[0] ? 'border-primary bg-primary-soft' : 'border-border'" :aria-pressed="cart.area === a[0]" @click="cart.setArea(a[0])">{{ a[1] }}<br><span class="hint">{{ taka(a[2]) }}<template v-if="a[3]"> · {{ a[3] }}</template></span></button>
            </div>
            <p v-if="errors.area" class="err">{{ errors.area }}</p>
          </fieldset>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="fld"><label for="di">District</label><input id="di" v-model="form.district" class="inp" required><p v-if="errors.district" class="err">{{ errors.district }}</p></div>
            <div class="fld"><label for="th">Thana / area</label><input id="th" v-model="form.thana" class="inp" required><p v-if="errors.thana" class="err">{{ errors.thana }}</p></div>
          </div>
          <div class="fld"><label for="ad">Delivery address</label><input id="ad" v-model="form.address_line" class="inp" autocomplete="street-address" required><p v-if="errors.address_line" class="err">{{ errors.address_line }}</p></div>
          <div class="fld"><label for="no">Order note (optional)</label><input id="no" v-model="form.note" class="inp" placeholder="Landmark, gift note…"></div>
        </section>

        <section class="card">
          <h2 class="text-2xl">Payment</h2>
          <p class="hint">Pay with bKash or Nagad and confirm with your transaction ID, or pay in cash when your order arrives.</p>
          <div class="grid gap-3 sm:grid-cols-3">
            <button v-for="m in enabled" :key="m" type="button" class="min-h-touch border p-3" :class="form.payment_method === m ? 'border-primary bg-primary-soft' : 'border-border'" :aria-pressed="form.payment_method === m" @click="form.payment_method = m; useTrack().push('add_payment_info', { payment_type: m })">{{ m === 'cod' ? 'Cash on delivery' : m === 'bkash' ? 'bKash' : 'Nagad' }}</button>
          </div>
          <p v-if="!enabled.length" class="err" role="alert">No payment method is available right now. Please contact us.</p>
          <div v-if="form.payment_method === 'cod'" class="border border-border bg-cream p-4 text-sm">Pay <b>{{ taka(total) }}</b> in cash to the courier when your order arrives. No transaction ID is needed. Please keep the exact amount ready.</div>
          <div v-if="isMobile" class="flex flex-col gap-4 border border-border bg-cream p-4 text-sm">
            <div>{{ payName }} merchant number: <b>{{ merchant }}</b><span v-if="(form.payment_method === 'bkash' ? s?.bkash_account_type : s?.nagad_account_type)"> ({{ form.payment_method === 'bkash' ? s?.bkash_account_type : s?.nagad_account_type }})</span></div>
            <ol class="list-decimal pl-5"><li>Open the {{ payName }} app and choose <b>Payment</b> or <b>Send Money</b>.</li><li>Send <b>{{ taka(total) }}</b> to the number above.</li><li>Enter the sender number and transaction ID below.</li></ol>
            <p v-if="s?.payment_instructions" class="whitespace-pre-line">{{ s.payment_instructions }}</p>
            <div class="fld"><label for="sn">Sender {{ payName }} number</label><input id="sn" v-model="form.sender_number" class="inp" inputmode="tel" placeholder="01XXXXXXXXX"><p v-if="errors.sender_number" class="err">{{ errors.sender_number }}</p></div>
            <div class="fld"><label for="tx">Transaction ID</label><input id="tx" v-model="form.trx_id" class="inp uppercase" placeholder="e.g. 8N7A6D5EE7"><p v-if="errors.trx_id" class="err">{{ errors.trx_id }}</p></div>
          </div>
          <p v-if="errors.payment_method" class="err">{{ errors.payment_method }}</p>
        </section>
      </div>

      <aside class="card h-fit" aria-label="Your order">
        <h2 class="text-2xl">Your order</h2>
        <ul class="flex flex-col gap-3">
          <li v-for="l in cart.lines" :key="l.variant" class="flex gap-3 text-sm">
            <NuxtImg v-if="l.image" format="webp" :src="mediaSrc(l.image)" :alt="l.name" width="48" height="64" class="h-16 w-12 object-cover" />
            <div class="flex-1">{{ l.quantity }} × {{ l.name }}<br><span class="hint">{{ l.label }}</span></div><div>{{ taka(Number(l.price) * l.quantity) }}</div>
          </li>
        </ul>
        <dl class="flex flex-col gap-2 border-t border-border pt-3 text-sm">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(subtotal) }}</dd></div>
          <div v-if="discount" class="flex justify-between"><dt>Coupon {{ cart.check?.coupon?.code }}</dt><dd>− {{ taka(discount) }}</dd></div>
          <div class="flex justify-between"><dt>Delivery</dt><dd>{{ fee !== null ? taka(fee) : 'Choose an area' }}</dd></div>
          <div class="flex justify-between border-t border-border pt-2 text-lg font-medium"><dt>Total</dt><dd>{{ fee !== null ? taka(total) : '—' }}</dd></div>
        </dl>
        <ul v-if="lineProblems.length" class="err flex flex-col gap-1" role="alert">
          <li v-for="p in lineProblems" :key="p.variant">{{ nameOf(p.variant) }} {{ issueText[p.issue] ?? 'needs attention' }}. <NuxtLink to="/cart" class="underline">Fix in bag</NuxtLink></li>
        </ul>
        <p v-if="message" class="text-sm" :class="lineProblems.length ? 'err' : 'hint'" role="alert">{{ message }}</p>
        <button class="btn" :disabled="busy || cart.checking || !enabled.length" data-track="checkout_submit">{{ busy ? 'Placing order…' : 'Place order' }}</button>
        <p class="hint">You can cancel this order any time before it ships.</p>
      </aside>
    </form>
  </div>
</template>
