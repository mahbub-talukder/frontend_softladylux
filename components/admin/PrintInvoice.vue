<script setup lang="ts">
// Design: OrderPrint board (invoice). SRS ORD-08 / SD-11: print-styled HTML, browser Print / Save
// as PDF, no server-side PDF. Company details come from Settings (SET-08).
import type { AdminOrder, PublicSettings } from '~/types/api'

defineProps<{ order: AdminOrder; site: PublicSettings | null }>()
const date = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <article class="print-sheet">
    <header class="flex items-start justify-between border-b-2 border-primary pb-4">
      <div>
        <div class="font-display text-3xl">{{ site?.company_name }}</div>
        <p class="hint">{{ site?.address_line1 || '[STORE ADDRESS]' }}, {{ site?.city || '[CITY]' }}<br>{{ site?.support_phones?.[0] || '[PHONE NUMBER]' }}</p>
      </div>
      <div class="text-right"><div class="font-display text-3xl text-primary">Invoice</div><div>{{ order.number }}</div><div class="hint">{{ date(order.placed_at) }}</div></div>
    </header>
    <section class="my-4 text-sm"><b>Bill to</b><br>{{ order.name }} · {{ order.phone }}<br>{{ order.address_line }}, {{ order.thana }}, {{ order.district }}</section>
    <table>
      <thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-right">Amount</th></tr></thead>
      <tbody><tr v-for="i in order.items" :key="i.id"><td>{{ i.product_name }}<span v-if="i.variant_label"> · {{ i.variant_label }}</span><br><span class="hint">{{ i.sku }}</span></td><td class="text-center">{{ i.quantity }}</td><td class="text-right">{{ taka(i.line_total) }}</td></tr></tbody>
    </table>
    <div class="mt-4 ml-auto w-64 text-sm">
      <div class="flex justify-between"><span>Subtotal</span><span>{{ taka(order.subtotal) }}</span></div>
      <div v-if="Number(order.coupon_discount)" class="flex justify-between"><span>Coupon {{ order.coupon_code }}</span><span>− {{ taka(order.coupon_discount) }}</span></div>
      <div class="flex justify-between"><span>Delivery ({{ order.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }})</span><span>{{ taka(order.delivery_fee) }}</span></div>
      <div class="flex justify-between border-t border-primary pt-1 text-lg font-medium"><span>Total</span><span>{{ taka(order.total) }}</span></div>
      <p class="hint mt-2">{{ order.payment_method === 'cod' ? 'Cash on delivery' : `Paid via ${order.payment_method}${order.payment?.trx_id ? ` · TrxID ${order.payment.trx_id}` : ''}` }}</p>
    </div>
    <p class="hint mt-8 text-center">Thank you for shopping with {{ site?.company_name }}.</p>
  </article>
</template>
