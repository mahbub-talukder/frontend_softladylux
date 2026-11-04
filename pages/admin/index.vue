<script setup lang="ts">
// Design: AdminDashboard + AdminMobile boards. SRS ADM-02: today's orders and revenue, orders
// awaiting confirmation, payments to verify (oldest first, PAY-08), stale Drafts (ORD-12), low stock
// (INV-11), 7-day sales, top products, recent orders. The API returns only the widgets for areas the
// user can open (PRM-04), so a Staff user never sees what they can't act on.
import type { Dashboard } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'dashboard.view' })
const auth = useAuthStore()
const { api } = useApi()
const d = ref<Dashboard>({})
const loading = ref(true)
const failed = ref(false)
onMounted(async () => {
  try { d.value = await api<Dashboard>('/admin/dashboard/') } catch { failed.value = true } finally { loading.value = false }
})
const hour = new Date().getHours()
const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
const empty = computed(() => !loading.value && !failed.value && !Object.keys(d.value).length)
const STAGES = ['draft', 'confirmed', 'shipping', 'delivered', 'cancelled', 'returned']
</script>

<template>
  <section>
    <AdminHeading :eyebrow="new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })" :title="`${greeting}, ${auth.me?.full_name?.split(' ')[0] || 'team'}`">
      <NuxtLink v-if="auth.can('orders.view')" to="/admin/orders" class="btn">Review orders</NuxtLink>
    </AdminHeading>
    <p v-if="loading" class="hint">Loading…</p>
    <p v-else-if="failed" class="err" role="alert">The dashboard could not be loaded. Try again.</p>
    <div v-else-if="empty" class="card"><p>Welcome, {{ auth.me?.full_name }}.</p><p class="hint">Your permissions don’t include any dashboard widgets yet. Ask the Owner for access.</p></div>

    <template v-else>
      <NuxtLink v-if="d.stale_drafts" to="/admin/orders?stale=1" class="card mb-4 border-accent" data-track="dashboard_stale_drafts">
        <b>Needs attention</b><span>{{ d.stale_drafts }} Draft order{{ d.stale_drafts === 1 ? ' is' : 's are' }} older than the stale limit. Confirm payment or follow up with the customer.</span>
      </NuxtLink>
      <div v-if="d.today" class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div class="card"><span class="cap">Orders today</span><span class="font-display text-4xl">{{ d.today.orders }}</span></div>
        <div class="card"><span class="cap">Revenue today</span><span class="font-display text-4xl">{{ taka(d.today.revenue) }}</span></div>
        <div class="card"><span class="cap">Awaiting confirmation</span><span class="font-display text-4xl">{{ d.awaiting_confirmation }}</span></div>
        <div v-if="d.stock" class="card"><span class="cap">Low / out of stock</span><span class="font-display text-4xl">{{ d.stock.low }} / {{ d.stock.out }}</span></div>
        <div v-else class="card"><span class="cap">Stale drafts</span><span class="font-display text-4xl">{{ d.stale_drafts }}</span></div>
      </div>
      <div v-else-if="d.stock" class="mb-6 grid grid-cols-2 gap-3"><div class="card"><span class="cap">Low stock</span><span class="font-display text-4xl">{{ d.stock.low }}</span></div><div class="card"><span class="cap">Out of stock</span><span class="font-display text-4xl">{{ d.stock.out }}</span></div></div>

      <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div class="flex flex-col gap-6">
          <div v-if="d.sales_7d" class="card"><h2 class="text-2xl">Sales, last 7 days</h2><AdminBarChart :points="d.sales_7d" label="Sales in the last 7 days" compact /></div>
          <div v-if="d.payments_to_verify?.length" class="card">
            <div class="flex items-center justify-between"><h2 class="text-2xl">Payments to verify</h2><NuxtLink to="/admin/orders?verify=1" class="underline">Open</NuxtLink></div>
            <ul class="text-sm"><li v-for="p in d.payments_to_verify" :key="p.id" class="flex items-center justify-between gap-3 border-b border-border py-2"><NuxtLink :to="`/admin/orders?open=${p.id}`" class="underline">{{ p.number }}</NuxtLink><span>{{ p.method }} · {{ p.trx_id }}</span><span>{{ taka(p.total) }}</span></li></ul>
          </div>
          <div v-if="d.recent_orders" class="card">
            <div class="flex items-center justify-between"><h2 class="text-2xl">Recent orders</h2><NuxtLink to="/admin/orders" class="underline">View all</NuxtLink></div>
            <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-2">Order</th><th class="p-2">Customer</th><th class="p-2">Payment</th><th class="p-2">Total</th><th class="p-2">Stage</th></tr></thead>
              <tbody><tr v-for="o in d.recent_orders" :key="o.id" class="border-t border-border"><td class="p-2"><NuxtLink :to="`/admin/orders?open=${o.id}`" class="underline">{{ o.number }}</NuxtLink></td><td class="p-2">{{ o.name }}</td><td class="p-2">{{ o.payment_method }}</td><td class="p-2">{{ taka(o.total) }}</td><td class="p-2 capitalize">{{ o.status }}</td></tr><tr v-if="!d.recent_orders.length"><td colspan="5" class="p-4 text-muted">No orders yet.</td></tr></tbody></table></div>
          </div>
        </div>
        <div class="flex flex-col gap-6">
          <div v-if="d.orders_by_stage" class="card"><div class="flex items-center justify-between"><h2 class="text-2xl">Orders by stage</h2><NuxtLink to="/admin/orders" class="underline">Open</NuxtLink></div>
            <ul class="text-sm"><li v-for="s in STAGES" :key="s" class="flex justify-between border-b border-border py-1 capitalize"><span>{{ s }}</span><b>{{ d.orders_by_stage[s] }}</b></li></ul>
            <p class="hint">Flow: Draft → Confirm → Shipping → Delivered. Cancelled and Returned are tracked separately.</p></div>
          <div v-if="d.top_products" class="card"><h2 class="text-2xl">Top products, 7 days</h2><ul class="text-sm"><li v-for="p in d.top_products" :key="p.name" class="flex justify-between border-b border-border py-1"><span>{{ p.name }} <span class="hint">× {{ p.units }}</span></span><span>{{ taka(p.revenue) }}</span></li><li v-if="!d.top_products.length" class="hint">No sales yet this week.</li></ul></div>
          <div v-if="d.stock" class="card"><div class="flex items-center justify-between"><h2 class="text-2xl">Low stock</h2><NuxtLink to="/admin/inventory" class="underline">Inventory</NuxtLink></div><ul class="text-sm"><li v-for="l in d.stock.low_items" :key="l.sku" class="flex justify-between border-b border-border py-1"><span>{{ l.name }} <span class="hint">{{ l.sku }}</span></span><b>{{ l.on_hand }} left</b></li><li v-if="!d.stock.low_items.length" class="hint">Nothing is running low.</li></ul></div>
        </div>
      </div>
    </template>
  </section>
</template>
