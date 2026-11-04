<script setup lang="ts">
// Design: OrderPrint board (invoice). SRS ORD-08 / SD-11: print-styled HTML, browser Print / Save
// as PDF, no server-side PDF. Company details come from Settings (SET-08).
import type { AdminOrder, PublicSettings } from '~/types/api'

defineProps<{ order: AdminOrder; site: PublicSettings | null }>()
const date = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
</script>

<template>
  <article class="print-sheet">
    <header class="flex items-start justify-between gap-4">
      <div>
        <div class="font-display text-[30px] leading-none">{{ site?.company_name }}</div>
        <p class="mt-1.5 text-[12.5px] leading-relaxed text-body">{{ site?.address_line1 || '[STORE ADDRESS]' }}, {{ site?.city || '[CITY]' }}<br>{{ site?.support_phones?.[0] || '[PHONE NUMBER]' }}</p>
      </div>
      <div class="text-right"><div class="text-xs font-semibold uppercase tracking-[0.18em]">Invoice</div><div class="mt-1 text-sm">{{ order.number }}<br>{{ date(order.placed_at) }}</div></div>
    </header>
    <section class="border-t border-ink pt-3.5 text-[13.5px] leading-relaxed"><b class="font-semibold">Bill to</b><br>{{ order.name }} · {{ order.phone }}<br>{{ order.address_line }}, {{ order.thana }}, {{ order.district }}</section>
    <table>
      <thead><tr><th>Item</th><th class="text-center">Qty</th><th class="text-right">Amount</th></tr></thead>
      <tbody><tr v-for="i in order.items" :key="i.id"><td>{{ i.product_name }}<span v-if="i.variant_label"> · {{ i.variant_label }}</span><br><span class="text-xs text-muted">{{ i.sku }}</span></td><td class="text-center">{{ i.quantity }}</td><td class="text-right">{{ taka(i.line_total) }}</td></tr></tbody>
    </table>
    <div class="self-end text-right text-[13.5px] leading-[1.9]">
      <div>Subtotal {{ taka(order.subtotal) }}</div>
      <div v-if="Number(order.coupon_discount)">Coupon {{ order.coupon_code }} − {{ taka(order.coupon_discount) }}</div>
      <div>Delivery ({{ order.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }}) {{ taka(order.delivery_fee) }}</div>
      <div class="text-base"><b class="font-semibold">Total {{ taka(order.total) }}</b></div>
      <div>{{ order.payment_method === 'cod' ? 'Cash on delivery' : `Paid via ${order.payment_method}${order.payment?.trx_id ? ` · TrxID ${order.payment.trx_id}` : ''}` }}</div>
    </div>
    <p class="border-t border-border pt-3 text-xs text-muted">Thank you for shopping with {{ site?.company_name }}.</p>
  </article>
</template>
