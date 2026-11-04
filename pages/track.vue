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
  <section class="mx-auto flex max-w-[680px] flex-col gap-8 py-2 md:py-6">
    <div class="flex flex-col gap-3"><div class="eyebrow">Order tracking</div><h1 class="font-display text-[42px] leading-none md:text-[56px]">Track your order</h1>
      <p class="text-base leading-[1.65] text-body">Enter your order number and the mobile number you used at checkout. No account needed.</p></div>
    <form class="flex flex-col gap-[18px] bg-cream p-6 md:p-8" @submit.prevent="track">
      <div class="fld"><label class="sf-lbl" for="tn">Order number</label><input id="tn" v-model="number" class="sf-inp uppercase" placeholder="SLL-261104-0001" required></div>
      <div class="fld"><label class="sf-lbl" for="tp">Mobile number</label><input id="tp" v-model="phone" class="sf-inp" inputmode="tel" placeholder="01XXXXXXXXX" required></div>
      <p v-if="error" class="border-l-[3px] border-accent bg-surface px-3.5 py-2.5 text-sm" role="alert">{{ error }}</p>
      <button class="btn !h-14" :disabled="busy" data-track="track_submit"><span v-if="busy" class="btn-spin" />Track order</button>
    </form>

    <div v-if="order" class="fade-in flex flex-col gap-6 border border-border bg-surface p-6 md:p-[34px]" aria-live="polite">
      <div class="flex flex-wrap items-baseline justify-between gap-2"><h2 class="font-display text-[28px] md:text-[32px]">{{ order.number }}</h2><span class="stage" :data-stage="order.status">{{ order.status_label }}</span></div>
      <p v-if="order.status === 'cancelled'" class="border-l-[3px] border-accent bg-cream px-5 py-[18px] text-[15px] leading-relaxed">This order was cancelled. If you already paid, we will contact you about the refund.</p>
      <ol class="flex flex-col">
        <li v-for="(t, i) in order.timeline" :key="t.at + t.status" class="flex min-h-16 gap-[18px]">
          <div class="flex flex-col items-center"><span class="mt-[3px] h-4 w-4 flex-none rounded-full border border-gold bg-gold" /><span class="w-px flex-1" :class="i < order.timeline.length - 1 ? 'bg-gold' : 'opacity-0'" /></div>
          <div class="pb-[18px]"><div class="text-[15px] font-medium uppercase tracking-[0.12em]">{{ t.label }}</div><div class="mt-0.5 text-sm text-muted">{{ when(t.at) }}<template v-if="t.detail"> · {{ t.detail }}</template></div></div>
        </li>
      </ol>
      <ul class="flex flex-col gap-2 border-t border-border pt-5 text-[15px]"><li v-for="i in order.items" :key="i.id" class="flex justify-between gap-4"><span>{{ i.quantity }} × {{ i.product_name }} <span class="text-[13.5px] text-muted">{{ i.variant_label }}</span></span><span class="whitespace-nowrap">{{ taka(i.line_total) }}</span></li></ul>
      <div class="flex items-baseline justify-between"><span class="sf-lbl">Total</span><span class="font-display text-[28px]">{{ taka(order.total) }}</span></div>
      <p class="-mt-3 text-[13.5px] text-muted">Payment: {{ order.payment_status }}</p>
      <div v-if="order.can_cancel" class="flex flex-col gap-3 border-t border-border pt-5">
        <button v-if="!cancelling" class="h-12 border border-accent text-xs font-medium uppercase tracking-[0.16em] text-accent transition-colors hover:bg-accent hover:text-primary-contrast" @click="cancelling = true">Cancel this order</button>
        <form v-else class="flex flex-col gap-3" @submit.prevent="cancel"><div class="fld"><label class="sf-lbl" for="cr">Reason for cancelling</label><input id="cr" v-model="reason" class="sf-inp" required minlength="3"></div><p v-if="cancelError" class="err" role="alert">{{ cancelError }}</p><div class="flex gap-3"><button class="btn !h-12 flex-1">Confirm cancellation</button><button type="button" class="btn-secondary !h-12" @click="cancelling = false">Keep order</button></div></form>
        <p class="text-[13.5px] leading-relaxed text-body">You can cancel any time before the order ships.</p>
      </div>
      <div v-else-if="!['cancelled', 'returned'].includes(order.status)" class="flex flex-col gap-3 border-t border-border pt-5">
        <button class="h-12 cursor-not-allowed border border-field bg-cream text-xs font-medium uppercase tracking-[0.16em] text-muted" disabled>Cancel unavailable</button>
        <p class="text-[13.5px] text-body">Orders cannot be cancelled once they have shipped. Call {{ s?.support_phones?.[0] || '[PHONE NUMBER]' }}.</p>
      </div>
    </div>
  </section>
</template>
