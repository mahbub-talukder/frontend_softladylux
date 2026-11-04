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
  <section class="mx-auto max-w-2xl">
    <template v-if="order">
      <div class="cap">Order received</div>
      <h1 class="text-4xl">Thank you, {{ order.name.split(' ')[0] }}</h1>
      <p class="mt-2">Your order <b>#{{ order.number }}</b> is placed. {{ next }}<template v-if="order.email"> A confirmation was sent to {{ order.email }}.</template></p>
      <div class="card mt-6">
        <ul class="flex flex-col gap-2 text-sm"><li v-for="i in order.items" :key="i.id" class="flex justify-between"><span>{{ i.quantity }} × {{ i.product_name }} <span class="hint">{{ i.variant_label }}</span></span><span>{{ taka(i.line_total) }}</span></li></ul>
        <dl class="flex flex-col gap-1 border-t border-border pt-3 text-sm">
          <div class="flex justify-between"><dt>Subtotal</dt><dd>{{ taka(order.subtotal) }}</dd></div>
          <div v-if="Number(order.coupon_discount)" class="flex justify-between"><dt>Coupon {{ order.coupon_code }}</dt><dd>− {{ taka(order.coupon_discount) }}</dd></div>
          <div class="flex justify-between"><dt>Delivery</dt><dd>{{ taka(order.delivery_fee) }}</dd></div>
          <div class="flex justify-between text-lg font-medium"><dt>Total</dt><dd>{{ taka(order.total) }}</dd></div>
        </dl>
        <p class="hint">Delivering to {{ order.address_line }}, {{ order.thana }}, {{ order.district }}. Payment: {{ order.payment_status }}.</p>
      </div>
      <ol class="mt-6 flex flex-wrap gap-2 text-sm"><li v-for="st in ['Order placed', 'Confirmed', 'Shipping', 'Delivered']" :key="st" class="border border-border px-3 py-1">{{ st }}</li></ol>
      <p class="hint mt-4">Questions? {{ s?.support_phones?.[0] || '[PHONE NUMBER]' }} · {{ s?.support_email || '[EMAIL ADDRESS]' }}. You can cancel any time before the order ships.</p>
      <div class="mt-6 flex gap-3"><NuxtLink to="/track" class="btn-secondary">Track my order</NuxtLink><NuxtLink to="/" class="btn">Continue shopping</NuxtLink></div>
    </template>
    <template v-else>
      <h1 class="text-4xl">Order {{ route.params.number }}</h1>
      <p class="hint mt-2">Enter the mobile number you used at checkout to view this order.</p>
      <form class="card mt-4" @submit.prevent="lookup">
        <div class="fld"><label for="tp">Mobile number</label><input id="tp" v-model="phone" class="inp" inputmode="tel" placeholder="01XXXXXXXXX" required></div>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <button class="btn" :disabled="busy">View order</button>
      </form>
    </template>
  </section>
</template>
