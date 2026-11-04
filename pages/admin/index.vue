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
const stageMax = computed(() => Math.max(1, ...STAGES.map((s) => d.value.orders_by_stage?.[s] ?? 0)))
</script>

<template>
  <section class="flex flex-col gap-7">
    <AdminHeading :eyebrow="new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })" :title="`${greeting}, ${auth.me?.full_name?.split(' ')[0] || 'team'}`">
      <NuxtLink v-if="auth.can('orders.view')" to="/admin/orders" class="btn">Review orders</NuxtLink>
    </AdminHeading>
    <div v-if="loading" class="grid grid-cols-2 gap-5 lg:grid-cols-4" aria-busy="true"><div v-for="n in 4" :key="n" class="skeleton h-[130px]" /></div>
    <p v-else-if="failed" class="border-l-[3px] border-accent bg-surface px-4 py-3 text-sm" role="alert">The dashboard could not be loaded. Reload the page to try again.</p>
    <div v-else-if="empty" class="card"><p>Welcome, {{ auth.me?.full_name }}.</p><p class="hint">Your permissions don’t include any dashboard widgets yet. Ask the Owner for access.</p></div>

    <template v-else>
      <div v-if="d.today" class="fade-in grid grid-cols-2 gap-3 sm:gap-5 xl:grid-cols-4">
        <div class="card !gap-2.5"><span class="cap">Orders today</span><span class="font-display text-[40px] leading-none md:text-[46px]">{{ d.today.orders }}</span><span class="text-[13.5px] text-body">Placed since midnight</span></div>
        <div class="card !gap-2.5"><span class="cap">Revenue today</span><span class="font-display text-[40px] leading-none md:text-[46px]">{{ taka(d.today.revenue) }}</span><span class="text-[13.5px] text-body">Confirmed and shipped orders</span></div>
        <div class="card !gap-2.5"><span class="cap">Awaiting confirmation</span><span class="font-display text-[40px] leading-none md:text-[46px]">{{ d.awaiting_confirmation }}</span><span class="text-[13.5px] text-body">Verify payment, then confirm</span></div>
        <div v-if="d.stock" class="card !gap-2.5"><span class="cap">Low-stock SKUs</span><span class="font-display text-[40px] leading-none md:text-[46px]">{{ d.stock.low }}<span v-if="d.stock.out" class="text-[22px] text-muted"> + {{ d.stock.out }} out</span></span><span class="text-[13.5px] text-body">Below reorder level ({{ d.stock.threshold }})</span></div>
        <div v-else class="card !gap-2.5"><span class="cap">Stale drafts</span><span class="font-display text-[40px] leading-none md:text-[46px]">{{ d.stale_drafts }}</span><span class="text-[13.5px] text-body">Older than the stale limit</span></div>
      </div>
      <div v-else-if="d.stock" class="grid grid-cols-2 gap-3 sm:gap-5"><div class="card !gap-2.5"><span class="cap">Low stock</span><span class="font-display text-[46px] leading-none">{{ d.stock.low }}</span></div><div class="card !gap-2.5"><span class="cap">Out of stock</span><span class="font-display text-[46px] leading-none">{{ d.stock.out }}</span></div></div>

      <NuxtLink v-if="d.stale_drafts" to="/admin/orders?stale=1" class="card flex-row flex-wrap items-center justify-between !gap-3 border-l-[3px] border-l-accent transition-colors hover:bg-cream" data-track="dashboard_stale_drafts">
        <span><span class="cap">Needs attention</span><br><span class="text-[15.5px]">{{ d.stale_drafts }} Draft order{{ d.stale_drafts === 1 ? ' is' : 's are' }} older than the stale limit. Confirm payment or follow up with the customer.</span></span><span class="cap border-b border-muted">Review drafts</span>
      </NuxtLink>

      <div class="grid gap-5 xl:grid-cols-[2fr_1fr]">
        <div v-if="d.sales_7d" class="card !gap-[22px]"><div class="flex items-baseline justify-between"><h2 class="font-display">Sales, last 7 days</h2><span class="cap">৳ thousand</span></div><AdminBarChart :points="d.sales_7d" label="Sales in the last 7 days" tall /></div>
        <div v-if="d.orders_by_stage" class="card !gap-5"><div class="flex items-baseline justify-between"><h2 class="font-display">Orders by stage</h2><NuxtLink to="/admin/orders" class="cap border-b border-muted">Open</NuxtLink></div>
          <div v-for="s in STAGES" :key="s" class="flex flex-col gap-[7px]"><div class="flex justify-between text-[14.5px] capitalize"><span>{{ s }}</span><b class="font-medium">{{ d.orders_by_stage[s] }}</b></div><div class="h-2 bg-cream"><div class="h-2 transition-[width] duration-500" :style="{ width: (d.orders_by_stage[s] ? Math.max(3, Math.round((d.orders_by_stage[s] / stageMax) * 100)) : 0) + '%', background: `var(--stage-${s}-fg)` }" /></div></div>
          <p class="mt-auto text-[13px] leading-relaxed text-muted">Flow: Draft → Confirm → Shipping → Delivered. Cancelled and Returned are tracked separately.</p></div>
      </div>

      <div class="grid items-start gap-5 xl:grid-cols-[2fr_1fr]">
        <div class="flex min-w-0 flex-col gap-5">
          <div v-if="d.payments_to_verify?.length" class="card">
            <div class="flex items-baseline justify-between"><h2 class="font-display">Payments to verify</h2><NuxtLink to="/admin/orders?verify=1" class="cap border-b border-muted">Open</NuxtLink></div>
            <ul class="text-sm"><li v-for="p in d.payments_to_verify" :key="p.id" class="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-border py-2.5"><NuxtLink :to="`/admin/orders?open=${p.id}`" class="font-medium underline">{{ p.number }}</NuxtLink><span class="text-body">{{ p.method }} · {{ p.trx_id }}</span><span>{{ taka(p.total) }}</span></li></ul>
          </div>
          <div v-if="d.recent_orders" class="card !gap-0 !px-0 !pb-2">
            <div class="flex items-baseline justify-between px-6 pb-3.5"><h2 class="font-display">Recent orders</h2><NuxtLink to="/admin/orders" class="cap border-b border-muted">View all</NuxtLink></div>
            <div class="flex flex-col gap-3 px-4 pb-4 md:hidden"><NuxtLink v-for="o in d.recent_orders" :key="o.id" :to="`/admin/orders?open=${o.id}`" class="flex flex-col gap-2.5 border border-border bg-surface p-4"><span class="flex items-baseline justify-between gap-3"><span class="font-display text-[23px]">{{ o.number }}</span><span class="stage" :data-stage="o.status">{{ o.status }}</span></span><span class="flex justify-between text-[14.5px] text-body"><span>{{ o.name }} · <span class="uppercase">{{ o.payment_method }}</span></span><b class="font-semibold text-ink">{{ taka(o.total) }}</b></span></NuxtLink><p v-if="!d.recent_orders.length" class="py-6 text-center text-muted">No orders yet.</p></div>
            <div class="hidden overflow-x-auto md:block"><table class="w-full"><thead><tr><th>Order</th><th>Customer</th><th>Payment</th><th class="!text-right">Total</th><th>Stage</th></tr></thead>
              <tbody><tr v-for="o in d.recent_orders" :key="o.id"><td class="font-medium"><NuxtLink :to="`/admin/orders?open=${o.id}`" class="hover:underline">{{ o.number }}</NuxtLink></td><td>{{ o.name }}</td><td class="uppercase">{{ o.payment_method }}</td><td class="text-right">{{ taka(o.total) }}</td><td><span class="stage" :data-stage="o.status">{{ o.status }}</span></td></tr><tr v-if="!d.recent_orders.length"><td colspan="5" class="py-8 text-center text-muted">No orders yet. New orders appear here as soon as they are placed.</td></tr></tbody></table></div>
          </div>
        </div>
        <div class="flex min-w-0 flex-col gap-5">
          <div v-if="d.stock" class="card !gap-[18px]"><div class="flex items-baseline justify-between"><h2 class="font-display">Low stock</h2><NuxtLink to="/admin/inventory" class="cap border-b border-muted">Inventory</NuxtLink></div>
            <div v-for="l in d.stock.low_items" :key="l.sku" class="flex items-center justify-between gap-3 border-b border-border pb-3.5"><div class="min-w-0"><div class="truncate text-[14.5px]">{{ l.name }}</div><div class="text-[12.5px] tracking-[0.06em] text-muted">{{ l.sku }}</div></div><span class="whitespace-nowrap bg-[var(--stage-shipping-bg)] px-2.5 py-[5px] text-[13px] font-semibold text-[var(--stage-shipping-fg)]">{{ l.on_hand }} left</span></div>
            <p v-if="!d.stock.low_items.length" class="hint">Nothing is running low.</p></div>
          <div v-if="d.top_products" class="card"><h2 class="font-display">Top products, 7 days</h2><ul class="text-sm"><li v-for="p in d.top_products" :key="p.name" class="flex justify-between gap-3 border-b border-border py-2"><span>{{ p.name }} <span class="text-muted">× {{ p.units }}</span></span><span>{{ taka(p.revenue) }}</span></li><li v-if="!d.top_products.length" class="hint">No sales yet this week.</li></ul></div>
        </div>
      </div>
    </template>
  </section>
</template>
