<script setup lang="ts">
// AdminOrders board: "Print delivery slips" for the selected orders, one slip per page.
import type { AdminOrder } from '~/types/api'

definePageMeta({ layout: 'print', permission: 'orders.view' })
const route = useRoute()
const { api } = useApi()
const orders = ref<AdminOrder[]>([])
onMounted(async () => {
  const ids = String(route.query.ids || '').split(',').map(Number).filter(Boolean).slice(0, 50)
  orders.value = await Promise.all(ids.map((id) => api<AdminOrder>(`/admin/orders/${id}/`)))
})
const print = () => window.print()
</script>

<template>
  <div>
    <div class="no-print p-4 text-right"><button class="btn" @click="print">Print {{ orders.length }} slips</button></div>
    <div v-for="o in orders" :key="o.id" class="page-break"><AdminPrintSlip :order="o" /></div>
  </div>
</template>
