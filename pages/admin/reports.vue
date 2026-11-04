<script setup lang="ts">
// Design: AdminReports board (Sales overview) + tabs built from the SRS for the parts the board
// lacks: order funnel (RPT-04), inventory report (RPT-05), coupon report (RPT-06). RPT-01 date presets
// and custom range; RPT-07 CSV for every table.
import type { CouponRow, FunnelRow, InventoryReport, SalesReport } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'reports.view' })
const { api, errorOf } = useApi()
const config = useRuntimeConfig()
const tab = ref<'sales' | 'funnel' | 'inventory' | 'coupons'>('sales')
const range = ref('30d')
const from = ref('')
const to = ref('')
const error = ref('')
const loading = ref(false)
const sales = ref<SalesReport | null>(null)
const funnel = ref<FunnelRow[]>([])
const inv = ref<InventoryReport | null>(null)
const coupons = ref<CouponRow[]>([])

const PRESETS = [['today', 'Today'], ['7d', 'Last 7 days'], ['30d', 'Last 30 days'], ['month', 'This month'], ['custom', 'Custom']] as const
const query = computed(() => ({ range: range.value, ...(range.value === 'custom' ? { from: from.value, to: to.value } : {}) }))
const csv = (report: string, section: string) => `${config.public.apiBase}/admin/reports/${report}/?${new URLSearchParams({ ...query.value, export: 'csv', section })}`
const label: Record<string, string> = { cod: 'Cash on delivery', bkash: 'bKash', nagad: 'Nagad', inside_dhaka: 'Inside Dhaka', outside_dhaka: 'Outside Dhaka' }

async function load() {
  error.value = ''; loading.value = true
  if (range.value === 'custom' && (!from.value || !to.value)) { loading.value = false; return }
  try {
    if (tab.value === 'sales') sales.value = await api<SalesReport>('/admin/reports/sales/', { query: query.value })
    else if (tab.value === 'funnel') funnel.value = (await api<{ rows: FunnelRow[] }>('/admin/reports/funnel/', { query: query.value })).rows
    else if (tab.value === 'inventory') inv.value = await api<InventoryReport>('/admin/reports/inventory/', { query: query.value })
    else coupons.value = (await api<{ rows: CouponRow[] }>('/admin/reports/coupons/', { query: query.value })).rows
  } catch (e) { const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message } finally { loading.value = false }
}
watch([tab, range], load)
onMounted(load)
const share = (v: string, rows: { revenue: string }[]) => { const t = rows.reduce((n, r) => n + Number(r.revenue), 0); return t ? Math.round((Number(v) / t) * 100) : 0 }
const stageName = (s: string) => ({ placed: 'Placed', confirmed: 'Confirmed', shipping: 'Shipping', delivered: 'Delivered', cancelled: 'Cancelled', returned: 'Returned' }[s] ?? s)
</script>

<template>
  <section>
    <AdminHeading eyebrow="Reports" title="Sales overview">
      <a v-if="tab === 'sales'" class="btn-secondary" :href="csv('sales', 'by_day')">Export CSV</a>
    </AdminHeading>
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <button v-for="p in PRESETS" :key="p[0]" class="min-h-touch border px-3 text-sm" :class="range === p[0] ? 'border-primary bg-primary-soft' : 'border-border'" :aria-pressed="range === p[0]" @click="range = p[0]">{{ p[1] }}</button>
      <template v-if="range === 'custom'"><input v-model="from" type="date" class="inp !w-40" aria-label="From date"><input v-model="to" type="date" class="inp !w-40" aria-label="To date"><button class="btn-secondary" @click="load">Apply</button></template>
    </div>
    <div class="mb-4 flex flex-wrap border-b border-border" role="tablist"><button v-for="t in ([['sales', 'Sales'], ['funnel', 'Order funnel'], ['inventory', 'Inventory'], ['coupons', 'Coupons']] as const)" :key="t[0]" class="tab" :aria-pressed="tab === t[0]" @click="tab = t[0]">{{ t[1] }}</button></div>
    <p v-if="error" class="err mb-3" role="alert">{{ error }}</p>
    <p v-if="loading" class="hint">Loading…</p>

    <template v-if="tab === 'sales' && sales">
      <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <div v-for="k in ([['Orders', sales.summary.orders], ['Revenue', taka(sales.summary.revenue)], ['Avg. order', taka(sales.summary.average_order_value)], ['Returns', sales.summary.returns], ['Coupon discounts', taka(sales.summary.coupon_discounts)]] as const)" :key="k[0]" class="card"><span class="cap">{{ k[0] }}</span><span class="font-display text-3xl">{{ k[1] }}</span></div>
      </div>
      <p class="hint mb-4">Revenue counts Confirmed, Shipping and Delivered orders; Cancelled and Returned are excluded. Orders are counted on the day they were placed.</p>
      <div class="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div class="card"><h2 class="text-2xl">Revenue by day</h2><AdminBarChart :points="sales.by_day" label="Revenue by day" /></div>
        <div class="flex flex-col gap-6">
          <div class="card"><div class="flex justify-between"><h2 class="text-2xl">By category</h2><a class="hint underline" :href="csv('sales', 'by_category')">CSV</a></div><ul class="text-sm"><li v-for="c in sales.by_category" :key="c.name" class="py-1"><div class="flex justify-between"><span>{{ c.name }}</span><span>{{ taka(c.revenue) }}</span></div><div class="h-1.5 bg-cream"><div class="h-full bg-primary" :style="{ width: `${share(c.revenue, sales.by_category)}%` }" /></div></li><li v-if="!sales.by_category.length" class="hint">No sales in this period.</li></ul></div>
          <div class="card"><div class="flex justify-between"><h2 class="text-2xl">Payment method</h2><a class="hint underline" :href="csv('sales', 'by_payment_method')">CSV</a></div><ul class="text-sm"><li v-for="m in sales.by_payment_method" :key="m.key" class="flex justify-between"><span>{{ label[m.key] ?? m.key }} · {{ share(m.revenue, sales.by_payment_method) }}%</span><span>{{ m.orders }} orders · {{ taka(m.revenue) }}</span></li></ul><p class="hint">Payments are verified manually against the merchant app.</p></div>
          <div class="card"><div class="flex justify-between"><h2 class="text-2xl">Delivery area</h2><a class="hint underline" :href="csv('sales', 'by_area')">CSV</a></div><ul class="text-sm"><li v-for="a in sales.by_area" :key="a.key" class="flex justify-between"><span>{{ label[a.key] ?? a.key }}</span><span>{{ a.orders }} orders · {{ taka(a.revenue) }}</span></li></ul></div>
        </div>
      </div>
      <div class="card mt-6"><div class="flex justify-between"><h2 class="text-2xl">Top products</h2><a class="hint underline" :href="csv('sales', 'top_products')">CSV</a></div>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-2">Product</th><th class="p-2">Category</th><th class="p-2">Units</th><th class="p-2">Revenue</th></tr></thead><tbody><tr v-for="p in sales.top_products" :key="p.name" class="border-t border-border"><td class="p-2">{{ p.name }}</td><td class="p-2">{{ p.category }}</td><td class="p-2">{{ p.units }}</td><td class="p-2">{{ taka(p.revenue) }}</td></tr></tbody></table></div></div>
    </template>

    <div v-if="tab === 'funnel'" class="card max-w-2xl"><div class="flex justify-between"><h2 class="text-2xl">Order funnel</h2><a class="hint underline" :href="csv('funnel', 'funnel')">CSV</a></div><ul class="text-sm"><li v-for="r in funnel" :key="r.stage" class="py-1"><div class="flex justify-between"><span>{{ stageName(r.stage) }}</span><span>{{ r.count }} · {{ r.rate }}%</span></div><div class="h-1.5 bg-cream"><div class="h-full bg-primary" :style="{ width: `${r.rate}%` }" /></div></li></ul><p class="hint">Of the orders placed in the period, how many reached each stage.</p></div>

    <div v-if="tab === 'inventory' && inv" class="flex flex-col gap-6">
      <div class="grid gap-6 lg:grid-cols-2">
        <div class="card"><div class="flex justify-between"><h2 class="text-2xl">Low stock (≤ {{ inv.threshold }})</h2><a class="hint underline" :href="csv('inventory', 'low')">CSV</a></div><ul class="text-sm"><li v-for="r in inv.low" :key="r.sku" class="flex justify-between border-b border-border py-1"><span>{{ r.product }} <span class="hint">{{ r.sku }}</span></span><b>{{ r.on_hand }}</b></li><li v-if="!inv.low.length" class="hint">Nothing is low.</li></ul></div>
        <div class="card"><div class="flex justify-between"><h2 class="text-2xl">Out of stock</h2><a class="hint underline" :href="csv('inventory', 'out')">CSV</a></div><ul class="text-sm"><li v-for="r in inv.out" :key="r.sku" class="border-b border-border py-1">{{ r.product }} <span class="hint">{{ r.sku }}</span></li><li v-if="!inv.out.length" class="hint">Nothing is out of stock.</li></ul></div>
      </div>
      <div class="card"><div class="flex justify-between"><h2 class="text-2xl">Movements in this period</h2><a class="hint underline" :href="csv('inventory', 'movements')">CSV</a></div><ul class="text-sm"><li v-for="m in inv.movements" :key="m.reason" class="flex justify-between border-b border-border py-1"><span class="capitalize">{{ m.reason.replace('_', ' ') }}</span><span>{{ m.movements }} movements · {{ m.units > 0 ? '+' : '' }}{{ m.units }} units</span></li><li v-if="!inv.movements.length" class="hint">No stock movements.</li></ul></div>
      <div class="card"><div class="flex justify-between"><h2 class="text-2xl">Stock by variant</h2><a class="hint underline" :href="csv('inventory', 'stock')">CSV</a></div><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-2">SKU</th><th class="p-2">Product</th><th class="p-2">Category</th><th class="p-2">On hand</th><th class="p-2">Level</th></tr></thead><tbody><tr v-for="r in inv.stock" :key="r.sku" class="border-t border-border"><td class="p-2">{{ r.sku }}</td><td class="p-2">{{ r.product }}</td><td class="p-2">{{ r.category }}</td><td class="p-2">{{ r.on_hand }}</td><td class="p-2">{{ r.level.replace('_', ' ') }}</td></tr></tbody></table></div></div>
    </div>

    <div v-if="tab === 'coupons'" class="card max-w-3xl"><div class="flex justify-between"><h2 class="text-2xl">Coupon usage</h2><a class="hint underline" :href="csv('coupons', 'coupons')">CSV</a></div><div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-2">Code</th><th class="p-2">Uses</th><th class="p-2">Discount given</th><th class="p-2">Order value</th></tr></thead><tbody><tr v-for="c in coupons" :key="c.code" class="border-t border-border"><td class="p-2">{{ c.code }}</td><td class="p-2">{{ c.uses }}</td><td class="p-2">{{ taka(c.discount) }}</td><td class="p-2">{{ taka(c.revenue) }}</td></tr><tr v-if="!coupons.length"><td colspan="4" class="p-4 text-muted">No coupons were used in this period.</td></tr></tbody></table></div></div>
  </section>
</template>
