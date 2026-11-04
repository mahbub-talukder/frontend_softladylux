<script setup lang="ts">
// SRS ORD-08 / scenario 25: invoice opens from the order and prints cleanly from the browser.
import type { AdminOrder } from '~/types/api'

definePageMeta({ layout: 'print', permission: 'orders.view' })
const route = useRoute()
const { api } = useApi()
const { data: site } = await useSiteSettings()
const order = ref<AdminOrder | null>(null)
onMounted(async () => { order.value = await api<AdminOrder>(`/admin/orders/${route.params.id}/`) })
const print = () => window.print()
</script>

<template>
  <div>
    <div class="no-print p-4 text-right"><button class="btn" @click="print">Print</button><NuxtLink to="/admin/orders" class="hint ml-4 underline">Back to orders</NuxtLink></div>
    <AdminPrintInvoice v-if="order" :order="order" :site="site" />
  </div>
</template>
