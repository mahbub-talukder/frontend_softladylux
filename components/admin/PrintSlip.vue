<script setup lang="ts">
// Design: OrderPrint board (delivery slip). SRS ORD-08: courier-ready slip with the amount to
// collect (COD) or "prepaid".
import type { AdminOrder } from '~/types/api'

defineProps<{ order: AdminOrder }>()
</script>

<template>
  <article class="print-sheet">
    <header class="flex items-center justify-between border-b-2 border-primary pb-3"><div class="font-display text-3xl text-primary">Delivery slip</div><div class="text-xl font-medium">{{ order.number }}</div></header>
    <section class="my-4"><b class="text-lg">{{ order.name }}</b><br>{{ order.phone }}<br>{{ order.address_line }}, {{ order.thana }}, {{ order.district }}</section>
    <section class="my-4 border border-primary p-3"><div class="cap">Collect (COD)</div><b class="text-2xl">{{ order.payment_method === 'cod' ? taka(order.total) : '৳ 0 — prepaid' }}</b></section>
    <p class="text-sm">{{ order.items.reduce((n, i) => n + i.quantity, 0) }} items · {{ order.area === 'inside_dhaka' ? 'Inside Dhaka' : 'Outside Dhaka' }}</p>
    <p v-if="order.note" class="text-sm">Note: {{ order.note }}</p>
    <ul class="mt-3 text-sm"><li v-for="i in order.items" :key="i.id">{{ i.quantity }} × {{ i.sku }} {{ i.variant_label }}</li></ul>
  </article>
</template>
