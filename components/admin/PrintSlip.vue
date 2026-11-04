<script setup lang="ts">
// Design: OrderPrint board (delivery slip). SRS ORD-08: courier-ready slip with the amount to
// collect (COD) or "prepaid".
import type { AdminOrder } from '~/types/api'

defineProps<{ order: AdminOrder }>()
</script>

<template>
  <article class="print-sheet slip">
    <div class="text-xs font-semibold uppercase tracking-[0.18em]">Delivery slip</div>
    <div class="font-display text-[34px] leading-none">{{ order.number }}</div>
    <div class="text-[15px] leading-[1.7]"><b class="font-semibold">{{ order.name }}</b><br>{{ order.phone }}<br>{{ order.address_line }}, {{ order.thana }}, {{ order.district }}</div>
    <div class="flex items-center justify-between gap-3 border border-ink p-3 text-sm"><span>Collect (COD)</span><b class="text-lg font-semibold">{{ order.payment_method === 'cod' ? taka(order.total) : '৳ 0 — prepaid' }}</b></div>
    <div class="text-[13.5px] leading-[1.7]">{{ order.items.reduce((n, i) => n + i.quantity, 0) }} items · {{ order.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }}<template v-if="order.note"><br>Note: {{ order.note }}</template></div>
    <ul class="border-t border-border pt-2.5 text-[13px] text-body"><li v-for="i in order.items" :key="i.id">{{ i.quantity }} × {{ i.sku }} {{ i.variant_label }}</li></ul>
  </article>
</template>
