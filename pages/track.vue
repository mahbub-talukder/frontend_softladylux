<script setup lang="ts">
// SRS ACC-09 / ORD-04 / STF /track. No board exists for this page: built from the SRS in the existing
// style (Auth form + My account tracking timeline). A guest tracks an order with its number + phone
// and may cancel it before Shipping with the same pair (decision: guests can cancel).
import type { CustomerOrder } from '~/types/api'

useSeoMeta({ title: 'Track your order', robots: 'noindex' })
const route = useRoute()
const { api, errorOf } = useApi()
const { data: s } = await useSiteSettings()
const number = ref(String(route.query.number || ''))
const phone = ref('')
const order = ref<CustomerOrder | null>(null)
const error = ref('')
const busy = ref(false)
const reason = ref('')
const cancelling = ref(false)
const cancelError = ref('')

async function track() {
  busy.value = true; error.value = ''; order.value = null
  try { order.value = await api<CustomerOrder>('/track/', { method: 'POST', body: { number: number.value, phone: phone.value } }) }
  catch (e) { error.value = errorOf(e).message } finally { busy.value = false }
}
async function cancel() {
  cancelError.value = ''
  try { order.value = await api<CustomerOrder>(`/orders/${order.value!.number}/cancel/`, { method: 'POST', body: { phone: phone.value, reason: reason.value } }); cancelling.value = false }
  catch (e) { const er = errorOf(e); cancelError.value = Object.values(er.fields).flat().join(' ') || er.message }
}
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <div class="cap">Order tracking</div><h1 class="text-4xl">Track your order</h1>
    <p class="hint mt-1">Enter your order number and the mobile number you used at checkout. No account needed.</p>
    <form class="card mt-4" @submit.prevent="track">
      <div class="fld"><label for="tn">Order number</label><input id="tn" v-model="number" class="inp uppercase" placeholder="SLL-261104-0001" required></div>
      <div class="fld"><label for="tp">Mobile number</label><input id="tp" v-model="phone" class="inp" inputmode="tel" placeholder="01XXXXXXXXX" required></div>
      <p v-if="error" class="err" role="alert">{{ error }}</p>
      <button class="btn" :disabled="busy" data-track="track_submit">Track order</button>
    </form>

    <div v-if="order" class="card mt-6">
      <div class="flex items-center justify-between"><h2 class="text-2xl">{{ order.number }}</h2><span class="border border-border px-2 py-1 text-xs uppercase tracking-widest">{{ order.status_label }}</span></div>
      <p v-if="order.status === 'cancelled'" class="text-sm">This order was cancelled. If you already paid, we will contact you about the refund.</p>
      <ol class="flex flex-col gap-3">
        <li v-for="t in order.timeline" :key="t.at + t.status" class="flex gap-3"><span class="mt-1 h-3 w-3 shrink-0 bg-primary" /><span><b>{{ t.label }}</b><br><span class="hint">{{ when(t.at) }}<template v-if="t.detail"> · {{ t.detail }}</template></span></span></li>
      </ol>
      <ul class="border-t border-border pt-3 text-sm"><li v-for="i in order.items" :key="i.id" class="flex justify-between"><span>{{ i.quantity }} × {{ i.product_name }} <span class="hint">{{ i.variant_label }}</span></span><span>{{ taka(i.line_total) }}</span></li></ul>
      <div class="flex justify-between text-lg font-medium"><span>Total</span><span>{{ taka(order.total) }}</span></div>
      <p class="hint">Payment: {{ order.payment_status }}</p>
      <template v-if="order.can_cancel">
        <button v-if="!cancelling" class="btn-secondary" @click="cancelling = true">Cancel this order</button>
        <form v-else class="flex flex-col gap-2" @submit.prevent="cancel"><label for="cr">Reason for cancelling</label><input id="cr" v-model="reason" class="inp" required minlength="3"><p v-if="cancelError" class="err" role="alert">{{ cancelError }}</p><button class="btn-secondary">Confirm cancellation</button></form>
        <p class="hint">You can cancel any time before the order ships.</p>
      </template>
      <template v-else-if="!['cancelled', 'returned'].includes(order.status)">
        <button class="btn-secondary" disabled>Cancel unavailable</button>
        <p class="hint">Orders cannot be cancelled once they have shipped. Call {{ s?.support_phones?.[0] || '[PHONE NUMBER]' }}.</p>
      </template>
    </div>
  </section>
</template>
