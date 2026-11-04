<script setup lang="ts">
// Design: Checkout board. SRS CHK-01..CHK-09, CRT-03/09, §11. Guest or logged-in; the server
// recomputes every price (CHK-06) and the form keeps what the customer typed on any error (UI-06).
import type { ApiError } from '~/composables/useApi'
import type { Address, CustomerOrder } from '~/types/api'

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

const customer = useCustomerStore()
const saved = ref<Address[]>([])
function useAddress(a: Address) {
  Object.assign(form, { name: a.recipient_name, phone: a.phone, district: a.district, thana: a.thana, address_line: a.address_line })
  cart.setArea(a.area)
}
onMounted(async () => {
  key.value = crypto.randomUUID()
  // Signed-in customers: prefill from the account and the default saved address (guests type it in)
  if (customer.me) {
    Object.assign(form, { name: customer.me.full_name, phone: customer.me.phone, email: customer.me.email ?? '' })
    saved.value = await api<Address[]>('/me/addresses/').catch(() => [])
    const d = saved.value.find((x) => x.is_default) ?? saved.value[0]
    if (d) useAddress(d)
  }
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
  <div class="pb-8">
    <div class="mb-8 flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-b border-border pb-5 md:mb-10">
      <ol class="flex flex-wrap gap-x-6 gap-y-1 text-xs font-medium uppercase tracking-[0.16em] md:gap-x-7" aria-label="Checkout steps">
        <li class="border-b-2 border-transparent py-1.5 text-muted">1 Bag</li><li class="border-b-2 border-accent py-1.5" aria-current="step">2 Details &amp; payment</li><li class="border-b-2 border-transparent py-1.5 text-muted">3 Confirmation</li>
      </ol>
      <NuxtLink to="/cart" class="lnk">← Back to bag</NuxtLink>
    </div>
    <h1 class="sr-only">Checkout</h1>
    <form v-if="cart.lines.length" class="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-16" @submit.prevent="place">
      <div class="flex min-w-0 flex-1 flex-col gap-10 md:gap-11">
        <section class="flex flex-col gap-5">
          <div class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b border-ink pb-3.5"><h2 class="font-display text-[28px] md:text-[34px]">Contact &amp; delivery</h2><span class="text-sm text-body">Have an account? <NuxtLink to="/login" class="border-b border-ink">Log in</NuxtLink></span></div>
          <p class="-mt-2 text-sm text-muted">Or just check out as a guest.</p>
          <div v-if="saved.length" class="fld"><label class="sf-lbl" for="sa">Saved address</label><select id="sa" class="sf-inp" @change="useAddress(saved[Number(($event.target as HTMLSelectElement).value)])"><option v-for="(a, i) in saved" :key="a.id" :value="i" :selected="a.is_default">{{ a.label }} — {{ a.address_line }}</option></select></div>
          <div class="grid gap-[18px] sm:grid-cols-2">
            <div class="fld "><label class="sf-lbl" for="fn">Full name</label><input id="fn" v-model="form.name" class="sf-inp" autocomplete="name" required><p v-if="errors.name" class="err">{{ errors.name }}</p></div>
            <div class="fld "><label class="sf-lbl" for="ph">Mobile number</label><input id="ph" v-model="form.phone" class="sf-inp" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" required><p v-if="errors.phone" class="err">{{ errors.phone }}</p></div>
            <div class="fld sm:col-span-2"><label class="sf-lbl" for="em">Email (optional)</label><input id="em" v-model="form.email" class="sf-inp" type="email" autocomplete="email" placeholder="name@email.com"><p v-if="errors.email" class="err">{{ errors.email }}</p></div>
            <div class="fld "><label class="sf-lbl" for="di">District</label><input id="di" v-model="form.district" class="sf-inp" required><p v-if="errors.district" class="err">{{ errors.district }}</p></div>
            <div class="fld "><label class="sf-lbl" for="th">Thana / area</label><input id="th" v-model="form.thana" class="sf-inp" required><p v-if="errors.thana" class="err">{{ errors.thana }}</p></div>
            <div class="fld sm:col-span-2"><label class="sf-lbl" for="ad">Delivery address</label><input id="ad" v-model="form.address_line" class="sf-inp" autocomplete="street-address" required><p v-if="errors.address_line" class="err">{{ errors.address_line }}</p></div>
            <div class="fld sm:col-span-2"><label class="sf-lbl" for="no">Order note (optional)</label><input id="no" v-model="form.note" class="sf-inp" placeholder="Landmark, gift note…"><p v-if="errors.note" class="err">{{ errors.note }}</p></div>
          </div>
        </section>

        <section class="flex flex-col gap-5">
          <div class="border-b border-ink pb-3.5"><h2 class="font-display text-[28px] md:text-[34px]">Delivery method</h2></div>
          <div class="flex flex-col gap-3" role="group" aria-label="Delivery area">
            <button v-for="a in ([['inside_dhaka', 'Inside Dhaka', s?.delivery_fee_inside_dhaka, s?.delivery_time_inside_dhaka], ['outside_dhaka', 'Outside Dhaka', s?.delivery_fee_outside_dhaka, s?.delivery_time_outside_dhaka]] as const)" :key="a[0]" type="button" class="flex w-full items-center justify-between gap-3.5 border px-[18px] py-5 text-left transition-colors md:px-[22px]" :class="cart.area === a[0] ? 'border-ink bg-surface' : 'border-field hover:border-ink'" :aria-pressed="cart.area === a[0]" @click="cart.setArea(a[0])">
              <span class="flex items-center gap-3.5"><span class="h-[18px] w-[18px] flex-none rounded-full border border-ink" :class="cart.area === a[0] ? 'bg-[radial-gradient(var(--color-ink)_0_45%,transparent_50%)]' : ''" /><span><span class="block text-base">{{ a[1] }}</span><span v-if="a[3]" class="mt-0.5 block text-[13.5px] text-muted">{{ a[3] }}</span></span></span>
              <span class="text-base">{{ taka(a[2]) }}</span>
            </button>
            <p v-if="errors.area" class="err">{{ errors.area }}</p>
          </div>
        </section>

        <section class="flex flex-col gap-5">
          <div class="border-b border-ink pb-3.5"><h2 class="font-display text-[28px] md:text-[34px]">Payment</h2><p class="mt-1.5 text-[14.5px] text-body">Pay with bKash or Nagad and confirm with your transaction ID, or pay in cash when your order arrives.</p></div>
          <div class="grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]" role="group" aria-label="Payment method">
            <button v-for="m in enabled" :key="m" type="button" class="flex min-h-[64px] items-center gap-3.5 border px-[18px] py-5 text-left transition-colors md:px-[22px]" :class="form.payment_method === m ? 'border-ink bg-surface' : 'border-field hover:border-ink'" :aria-pressed="form.payment_method === m" @click="form.payment_method = m; useTrack().push('add_payment_info', { payment_type: m })">
              <span class="h-[18px] w-[18px] flex-none rounded-full border border-ink" :class="form.payment_method === m ? 'bg-[radial-gradient(var(--color-ink)_0_45%,transparent_50%)]' : ''" />
              <span class="font-display text-[26px] font-semibold leading-[1.1]">{{ m === 'cod' ? 'Cash on Delivery' : m === 'bkash' ? 'bKash' : 'Nagad' }}</span>
            </button>
          </div>
          <p v-if="!enabled.length" class="err" role="alert">No payment method is available right now. Please contact us.</p>
          <div v-if="form.payment_method === 'cod'" class="flex flex-col gap-2.5 bg-cream p-6 md:p-7"><div class="sf-lbl">Cash on delivery</div><p class="text-[15px] leading-[1.7] text-body">Pay <b class="font-medium text-ink">{{ taka(total) }}</b> in cash to the courier when your order arrives. No transaction ID is needed. Please keep the exact amount ready.</p></div>
          <div v-if="isMobile" class="flex flex-col gap-[18px] bg-cream p-6 md:p-7">
            <div class="flex flex-wrap items-baseline justify-between gap-3"><div class="sf-lbl">{{ payName }} merchant number<span v-if="(form.payment_method === 'bkash' ? s?.bkash_account_type : s?.nagad_account_type)" class="ml-2 font-normal normal-case tracking-normal text-muted">({{ form.payment_method === 'bkash' ? s?.bkash_account_type : s?.nagad_account_type }})</span></div><div class="font-display text-[28px] tracking-[0.06em] md:text-[32px]">{{ merchant || '[MERCHANT NUMBER]' }}</div></div>
            <ol class="list-decimal pl-5 text-[15px] leading-[1.8] text-body"><li>Open the {{ payName }} app and choose <b class="font-medium">Payment</b> or <b class="font-medium">Send Money</b>.</li><li>Send <b class="font-medium">{{ taka(total) }}</b> to the number above.</li><li>Enter the sender number and transaction ID below.</li></ol>
            <p v-if="s?.payment_instructions" class="whitespace-pre-line text-[15px] text-body">{{ s.payment_instructions }}</p>
            <div class="grid gap-[18px] sm:grid-cols-2">
              <div class="fld"><label class="sf-lbl" for="sn">Sender {{ payName }} number</label><input id="sn" v-model="form.sender_number" class="sf-inp" inputmode="tel" placeholder="01XXXXXXXXX"><p v-if="errors.sender_number" class="err">{{ errors.sender_number }}</p></div>
              <div class="fld"><label class="sf-lbl" for="tx">Transaction ID</label><input id="tx" v-model="form.trx_id" class="sf-inp uppercase" placeholder="e.g. 8N7A6D5EE7"><p v-if="errors.trx_id" class="err">{{ errors.trx_id }}</p></div>
            </div>
          </div>
          <p v-if="errors.payment_method" class="err">{{ errors.payment_method }}</p>
        </section>
      </div>

      <aside class="flex w-full flex-col gap-[22px] border border-border bg-surface p-6 md:p-[34px] lg:sticky lg:top-24 lg:max-w-[480px] lg:flex-1" aria-label="Your order">
        <h2 class="font-display text-[32px]">Your order</h2>
        <ul class="flex flex-col gap-[18px]">
          <li v-for="l in cart.lines" :key="l.variant" class="flex items-center gap-4">
            <div class="relative w-[72px] flex-none"><StoreTile :src="l.image" :alt="l.name" :tile-key="l.variant" ratio="3/4" :width="72" :height="96" art-width="56%" /><span class="absolute -right-2 -top-2 flex h-[22px] w-[22px] items-center justify-center rounded-full bg-ink text-xs text-bg">{{ l.quantity }}</span></div>
            <div class="min-w-0 flex-1"><div class="font-display text-[21px] leading-[1.15]">{{ l.name }}</div><div class="text-[13.5px] text-muted">{{ l.label }}</div></div><div class="text-[15px]">{{ taka(Number(l.price) * l.quantity) }}</div>
          </li>
        </ul>
        <dl class="flex flex-col gap-[11px] border-t border-border pt-[18px] text-[15px]">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(subtotal) }}</dd></div>
          <div v-if="discount" class="flex justify-between text-rose-deep"><dt>Coupon {{ cart.check?.coupon?.code }}</dt><dd>− {{ taka(discount) }}</dd></div>
          <div class="flex justify-between"><dt>Delivery</dt><dd>{{ fee !== null ? taka(fee) : 'Choose an area' }}</dd></div>
        </dl>
        <div class="flex items-baseline justify-between border-t border-ink pt-4"><span class="sf-lbl">Total</span><span class="font-display text-4xl">{{ fee !== null ? taka(total) : '—' }}</span></div>
        <ul v-if="lineProblems.length" class="err flex flex-col gap-1" role="alert">
          <li v-for="p in lineProblems" :key="p.variant">{{ nameOf(p.variant) }} {{ issueText[p.issue] ?? 'needs attention' }}. <NuxtLink to="/cart" class="underline">Fix in bag</NuxtLink></li>
        </ul>
        <p v-if="message" class="border-l-[3px] border-accent bg-cream px-3.5 py-2.5 text-sm" role="alert">{{ message }}</p>
        <button class="btn !h-14" :disabled="busy || cart.checking || !enabled.length" data-track="checkout_submit"><span v-if="busy" class="btn-spin" />{{ busy ? 'Placing order…' : 'Place order' }}</button>
        <p class="text-center text-[13px] leading-relaxed text-muted">You can cancel this order any time before it ships.</p>
      </aside>
    </form>
  </div>
</template>
