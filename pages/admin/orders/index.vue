<script setup lang="ts">
// Design: AdminOrders board. SRS ORD-07 (search, filters, sort, pagination, bulk Confirm / Ship /
// Cancel with a failure report), ORD-12 (stale Drafts highlighted), PAY-08 (payments to verify).
import type { AdminOrderRow, Paged } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'orders.view' })
const auth = useAuthStore()
const { api, errorOf } = useApi()
const route = useRoute()

const STATUSES = ['', 'draft', 'confirmed', 'shipping', 'delivered', 'cancelled', 'returned']
const f = reactive({ status: '', q: '', payment_method: '', payment_status: '', area: '', date_from: '', date_to: '', stale: false })
const page = ref(1)
const selected = ref<number[]>([])
const openId = ref<number | null>(Number(route.query.open) || null)
const result = ref<{ done: string[]; failed: { number: string; message: string }[] } | null>(null)
const bulkError = ref('')
const reason = ref('')
const courier = ref('')

type OrdersPage = Paged<AdminOrderRow> & { counts: Record<string, number> }
const { data, pending, refresh } = await useAsyncData('admin-orders', () =>
  api<OrdersPage>('/admin/orders/', { query: { page: page.value, status: f.status || undefined, q: f.q || undefined, payment_method: f.payment_method || undefined, payment_status: f.payment_status || undefined, area: f.area || undefined, date_from: f.date_from || undefined, date_to: f.date_to || undefined, stale: f.stale ? 1 : undefined } }),
{ watch: [page] })
const pages = computed(() => Math.max(1, Math.ceil((data.value?.count ?? 0) / 20)))
const total = computed(() => Object.values(data.value?.counts ?? {}).reduce((a, b) => a + b, 0))
const allOn = computed(() => !!data.value?.results.length && data.value.results.every((r) => selected.value.includes(r.id)))
const canManage = computed(() => auth.can('orders.manage'))

function apply() { page.value = 1; selected.value = []; refresh() }
function tab(s: string) { f.status = s; f.stale = false; f.payment_status = ''; apply() }
function toVerify() { f.status = 'draft'; f.payment_status = 'pending'; f.payment_method = ''; f.stale = false; apply() }
function stale() { f.status = ''; f.stale = true; apply() }
const toggleAll = () => { selected.value = allOn.value ? [] : data.value!.results.map((r) => r.id) }
const d = (v: string) => new Date(v).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })

async function bulk(to: string) {
  bulkError.value = ''; result.value = null
  if (!selected.value.length) { bulkError.value = 'Select at least one order.'; return }
  if (to === 'cancelled' && !reason.value.trim()) { bulkError.value = 'Enter a cancellation reason first.'; return }
  try {
    result.value = await api('/admin/orders/bulk-transition/', { method: 'POST', body: { ids: selected.value, to, reason: reason.value, courier: courier.value } })
    selected.value = []; await refresh()
  } catch (e) { bulkError.value = errorOf(e).message }
}
const slipsUrl = computed(() => `/admin/orders/slips?ids=${selected.value.join(',')}`)
</script>

<template>
  <section>
    <AdminHeading eyebrow="Order management" title="Orders">
      <NuxtLink v-if="selected.length" :to="slipsUrl" class="btn-secondary" target="_blank">Print delivery slips ({{ selected.length }})</NuxtLink>
    </AdminHeading>
    <div class="mb-3 flex flex-wrap items-center gap-1 border-b border-border" role="tablist">
      <button v-for="s in STATUSES" :key="s" class="tab" :aria-pressed="f.status === s && !f.stale && !f.payment_status" @click="tab(s)">{{ s ? s[0].toUpperCase() + s.slice(1) : 'All' }} {{ s ? data?.counts[s] ?? 0 : total }}</button>
      <button class="tab ml-auto" :aria-pressed="f.payment_status === 'pending'" @click="toVerify">Payments to verify</button>
      <button class="tab" :aria-pressed="f.stale" @click="stale">Stale drafts</button>
    </div>
    <form class="mb-4 flex flex-wrap gap-2" @submit.prevent="apply">
      <input v-model="f.q" class="inp !w-64" placeholder="Search order, customer, mobile, TrxID…" aria-label="Search orders">
      <select v-model="f.payment_method" class="inp !w-40" aria-label="Payment method"><option value="">All payments</option><option value="bkash">bKash</option><option value="nagad">Nagad</option><option value="cod">Cash on delivery</option></select>
      <select v-model="f.area" class="inp !w-40" aria-label="Area"><option value="">All areas</option><option value="inside_dhaka">Inside Dhaka</option><option value="outside_dhaka">Outside Dhaka</option></select>
      <input v-model="f.date_from" type="date" class="inp !w-40" aria-label="From date"><input v-model="f.date_to" type="date" class="inp !w-40" aria-label="To date">
      <button class="btn-secondary">Filter</button>
    </form>

    <div v-if="canManage && selected.length" class="card mb-4">
      <p class="text-sm">{{ selected.length }} selected</p>
      <div class="flex flex-wrap items-end gap-2">
        <button class="btn-secondary" @click="bulk('confirmed')">Confirm</button>
        <input v-model="courier" class="inp !w-44" placeholder="Courier (for Ship)" aria-label="Courier"><button class="btn-secondary" @click="bulk('shipping')">Ship</button>
        <input v-model="reason" class="inp !w-56" placeholder="Reason (for Cancel)" aria-label="Cancel reason"><button class="btn-secondary" @click="bulk('cancelled')">Cancel</button>
      </div>
      <p v-if="bulkError" class="err" role="alert">{{ bulkError }}</p>
    </div>
    <div v-if="result" class="card mb-4 text-sm" role="status">
      <p>{{ result.done.length }} order(s) updated<template v-if="result.done.length">: {{ result.done.join(', ') }}</template>.</p>
      <ul v-if="result.failed.length" class="err"><li v-for="x in result.failed" :key="x.number">{{ x.number }}: {{ x.message }}</li></ul>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div>
        <div class="overflow-x-auto border border-border bg-surface">
          <table class="w-full text-left text-sm">
            <thead><tr class="cap"><th class="p-3"><input type="checkbox" aria-label="Select all" :checked="allOn" @change="toggleAll"></th><th class="p-3">Order</th><th class="p-3">Customer</th><th class="p-3">Payment</th><th class="p-3">Total</th><th class="p-3">Stage</th></tr></thead>
            <tbody>
              <tr v-if="pending"><td colspan="6" class="p-4 text-muted">Loading…</td></tr>
              <tr v-for="o in data?.results" :key="o.id" class="cursor-pointer border-t border-border" :class="[openId === o.id ? 'bg-primary-soft' : '', o.is_stale ? 'border-l-4 border-l-accent' : '']" @click="openId = o.id">
                <td class="p-3" @click.stop><input v-model="selected" type="checkbox" :value="o.id" :aria-label="`Select ${o.number}`"></td>
                <td class="p-3"><button class="underline" @click.stop="openId = o.id">{{ o.number }}</button><br><span class="hint">{{ d(o.placed_at) }}<template v-if="o.is_stale"> · Draft over limit</template></span></td>
                <td class="p-3">{{ o.name }}<br><span class="hint">{{ o.phone }}</span></td>
                <td class="p-3">{{ o.payment_method === 'cod' ? 'COD' : o.payment_method }} <span class="hint">· {{ o.payment_status }}</span></td>
                <td class="p-3">{{ taka(o.total) }}</td>
                <td class="p-3 capitalize">{{ o.status }}</td>
              </tr>
              <tr v-if="!pending && !data?.results.length"><td colspan="6" class="p-6 text-center text-muted">No orders match.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <button class="btn-secondary" :disabled="page <= 1" @click="page--">Previous</button>
          <span class="hint">Page {{ page }} of {{ pages }} · {{ data?.count ?? 0 }} orders</span>
          <button class="btn-secondary" :disabled="page >= pages" @click="page++">Next</button>
        </div>
      </div>
      <AdminOrderPanel v-if="openId" :id="openId" @changed="refresh()" />
    </div>
  </section>
</template>
