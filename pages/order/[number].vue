<script setup lang="ts">
// Design: Checkout board (confirmation step). SRS CHK-07: order number, summary, what happens
// next, contact details. Reload falls back to the guest lookup (order number + phone).
import type { CustomerOrder } from '~/types/api'

useSeoMeta({ title: 'Order received', robots: 'noindex' })
const route = useRoute()
const { api, errorOf } = useApi()
const { data: s } = await useSiteSettings()
const order = ref<CustomerOrder | null>(null)
const phone = ref('')
const error = ref('')
const busy = ref(false)

onMounted(() => {
  try {
    const saved = JSON.parse(sessionStorage.getItem('sll_last_order') || 'null') as CustomerOrder | null
    if (saved && saved.number === route.params.number) order.value = saved
  } catch { /* storage unavailable or corrupt: ask for the phone number */ }
})
async function lookup() {
  busy.value = true; error.value = ''
  try { order.value = await api<CustomerOrder>('/track/', { method: 'POST', body: { number: route.params.number, phone: phone.value } }) }
  catch (e) { error.value = errorOf(e).message } finally { busy.value = false }
}
const next = computed(() => order.value?.payment_method === 'cod'
  ? 'Our team will confirm your order shortly. You will pay in cash when it arrives.'
  : 'Our team will verify your payment and then confirm your order.')
</script>

<template>
  <section class="mx-auto flex max-w-[760px] flex-col items-center gap-6 py-6 text-center md:gap-[26px] md:py-12">
    <template v-if="order">
      <div class="flex h-[76px] w-[76px] items-center justify-center border border-gold text-gold"><svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg></div>
      <div class="eyebrow">Order received</div>
      <h1 class="font-display text-h1 leading-none md:text-h1-lg">Thank you, {{ order.name.split(' ')[0] }}</h1>
      <p class="max-w-[520px] text-base leading-[1.7] text-body md:text-[17px]">Your order <b class="font-medium text-ink">#{{ order.number }}</b> is placed. {{ next }}<template v-if="order.email"> A confirmation was sent to {{ order.email }}.</template></p>
      <ol class="mt-2 grid w-full grid-cols-4 border-t border-border" aria-label="Order progress">
        <li v-for="(st, i) in ['Order placed', 'Confirmed', 'Shipping', 'Delivered']" :key="st" class="flex flex-col items-center gap-2.5 px-1 py-5 md:py-[22px]"><span class="h-3.5 w-3.5 rounded-full border border-gold" :class="i === 0 ? 'bg-gold' : ''" /><span class="text-xs uppercase tracking-[0.12em] md:text-xs md:tracking-[0.14em]" :class="i === 0 ? 'font-semibold' : 'text-muted'">{{ st }}</span></li>
      </ol>
      <div class="w-full bg-cream p-6 text-left md:p-8">
        <ul class="flex flex-col gap-2.5 text-[15px]"><li v-for="i in order.items" :key="i.id" class="flex justify-between gap-4"><span>{{ i.quantity }} × {{ i.product_name }} <span class="text-[13.5px] text-muted">{{ i.variant_label }}</span></span><span class="whitespace-nowrap">{{ taka(i.line_total) }}</span></li></ul>
        <dl class="mt-4 flex flex-col gap-2 border-t border-field pt-4 text-[15px]">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(order.subtotal) }}</dd></div>
          <div v-if="Number(order.coupon_discount)" class="flex justify-between text-rose-deep"><dt>Coupon {{ order.coupon_code }}</dt><dd>− {{ taka(order.coupon_discount) }}</dd></div>
          <div class="flex justify-between"><dt>Delivery</dt><dd>{{ taka(order.delivery_fee) }}</dd></div>
          <div class="flex items-baseline justify-between border-t border-ink pt-3"><dt class="text-xs font-semibold uppercase tracking-[0.18em]">Total</dt><dd class="font-display text-h2">{{ taka(order.total) }}</dd></div>
        </dl>
        <p class="mt-3 text-[13.5px] text-muted">Delivering to {{ order.address_line }}, {{ order.thana }}, {{ order.district }}. Payment: {{ order.payment_status }}.</p>
      </div>
      <p class="text-sm text-muted">Questions? {{ s?.support_phones?.[0] || '[PHONE NUMBER]' }} · {{ s?.support_email || '[EMAIL ADDRESS]' }}. You can cancel any time before the order ships.</p>
      <div class="flex flex-wrap justify-center gap-3.5"><NuxtLink to="/track" class="btn">Track my order</NuxtLink><NuxtLink to="/" class="btn-secondary">Continue shopping</NuxtLink></div>
    </template>
    <template v-else>
      <div class="eyebrow">Order {{ route.params.number }}</div>
      <h1 class="font-display text-h1 leading-none md:text-h1-lg">View your order</h1>
      <p class="text-body">Enter the mobile number you used at checkout to view this order.</p>
      <form class="flex w-full max-w-[420px] flex-col gap-4 bg-cream p-6 text-left md:p-8" @submit.prevent="lookup">
        <div class="fld"><label class="sf-lbl" for="tp">Mobile number</label><input id="tp" v-model="phone" class="sf-inp" inputmode="tel" placeholder="01XXXXXXXXX" required></div>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button class="btn" :disabled="busy"><span v-if="busy" class="btn-spin" />View order</button>
      </form>
    </template>
  </section>
</template>
