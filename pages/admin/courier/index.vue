<script setup lang="ts">
// SRS v1.7 CRR-12 Courier dashboard: Steadfast balance, the four dashboard states with a paged
// parcel list for each, and outcome stats for a date range. Figures come from Steadfast (cached
// 60 s on the server); each part shows its own error so one failure does not blank the page.
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'courier.view' })
const { api, errorOf } = useApi()

interface Part<T = Dict> { ok: boolean; data?: T; code?: string; message?: string }
interface Dash { balance: Part; states: Part; stats: Part; from: string; to: string; configured: boolean; keys_rejected: boolean }

const range = reactive({ from: '', to: '' })
const { data, pending, refresh, error } = await useAsyncData('courier-dashboard', () =>
  api<Dash>('/admin/courier/dashboard/', { query: { from: range.from || undefined, to: range.to || undefined }, toast: false }))
watchEffect(() => { if (data.value && !range.from) { range.from = data.value.from; range.to = data.value.to } })

const STATES = [
  { key: 'in_review', label: 'In review', hint: 'Booked, waiting for Steadfast to approve.' },
  { key: 'delivery_processing', label: 'Delivery processing', hint: 'Approved and with the rider.' },
  { key: 'cod_processing', label: 'COD processing', hint: 'Finished by the rider, awaiting Steadfast approval.' },
  { key: 'return_requests', label: 'Return requests', hint: 'A hub asks you to agree to cancel a parcel.' }
] as const
const OUTCOMES = [['delivered', 'Delivered'], ['partial', 'Partly delivered'], ['cancelled', 'Cancelled'], ['pending', 'With the rider'], ['approval', 'Awaiting approval']] as const
const states = computed(() => (data.value?.states.data?.states ?? {}) as Record<string, { count: number; cod_amount?: number }>)
const stats = computed(() => (data.value?.stats.data ?? {}) as Dict)

// Drill-down: one state's parcels, latest first, a page at a time.
const open = ref<string | null>(null)
const page = ref(1)
const list = ref<{ data: Dict[]; meta: Dict } | null>(null)
const listError = ref('')
const listBusy = ref(false)
async function loadState(key: string, p = 1) {
  open.value = key; page.value = p; listError.value = ''; listBusy.value = true
  try { list.value = await api(`/admin/courier/parcel-states/${key}/`, { query: { page: p }, toast: false }) } catch (e) {
    list.value = null; listError.value = errorOf(e).message
  } finally { listBusy.value = false }
}
const rowOf = (r: Dict): Dict => (r.consignment ? { ...r.consignment, reason: r.reason } : r) // return_requests wrap the parcel
const rows = computed(() => (list.value?.data ?? []).map(rowOf))
const lastPage = computed(() => Number(list.value?.meta?.last_page ?? 1))
const d = (v: string) => (v ? new Date(v).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '')
const loadError = computed(() => (error.value ? errorOf(error.value).message : ''))
</script>

<template>
  <section>
    <AdminHeading eyebrow="Courier · Steadfast" title="Courier">
      <NuxtLink to="/admin/courier/returns" class="btn-secondary">Returns</NuxtLink>
      <NuxtLink v-if="useAuthStore().can('courier.manage')" to="/admin/courier/pickups" class="btn-secondary">Pickups</NuxtLink>
    </AdminHeading>

    <p v-if="loadError" class="err mb-4" role="alert">{{ loadError }}</p>
    <div v-if="data && !data.configured" class="card mb-5 text-sm" role="status">Steadfast is not set up yet. Add the API and secret keys in <NuxtLink to="/admin/settings" class="underline">Settings → Courier</NuxtLink>.</div>
    <div v-else-if="data?.keys_rejected" class="card mb-5 text-sm" role="alert"><p class="err">Steadfast rejected the saved keys, so every courier call is paused. Check the keys in <NuxtLink to="/admin/settings" class="underline">Settings → Courier</NuxtLink> and save to resume.</p></div>

    <div v-if="data" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
      <div class="card"><span class="cap">Balance owed to you</span>
        <span v-if="data.balance.ok" class="font-display text-3xl">{{ taka(data.balance.data?.current_balance ?? 0) }}</span>
        <span v-else class="err text-sm">{{ data.balance.message }}</span>
        <span class="hint">Delivered COD less charges.</span>
      </div>
      <button v-for="s in STATES" :key="s.key" type="button" class="card text-left transition-colors hover:border-ink" :aria-pressed="open === s.key" :disabled="!data.states.ok" @click="loadState(s.key)">
        <span class="cap">{{ s.label }}</span>
        <template v-if="data.states.ok"><span class="font-display text-3xl">{{ states[s.key]?.count ?? 0 }}</span><span v-if="states[s.key]?.cod_amount != null" class="text-sm">COD {{ taka(states[s.key]?.cod_amount ?? 0) }}</span></template>
        <span v-else class="err text-sm">{{ data.states.message }}</span>
        <span class="hint">{{ s.hint }}</span>
      </button>
    </div>

    <div v-if="open" class="card mt-6">
      <div class="flex flex-wrap items-baseline justify-between gap-2"><h2 class="text-2xl">{{ STATES.find((s) => s.key === open)?.label }}</h2><button type="button" class="hint underline" @click="open = null">Close</button></div>
      <p v-if="listError" class="err" role="alert">{{ listError }}</p>
      <div v-else class="overflow-x-auto"><table class="w-full text-left text-sm">
        <thead><tr class="cap"><th class="p-2">Invoice</th><th class="p-2">Consignment</th><th class="p-2">Recipient</th><th class="p-2 !text-right">COD</th><th class="p-2">Status</th><th class="p-2">Updated</th></tr></thead>
        <tbody>
          <tr v-if="listBusy"><td colspan="6" class="p-3 text-muted">Loading…</td></tr>
          <tr v-for="r in (listBusy ? [] : rows)" :key="r.consignment_id" class="border-t border-border">
            <td class="p-2 font-semibold">{{ r.invoice }}</td>
            <td class="p-2"><a v-if="r.tracking_link" :href="r.tracking_link" target="_blank" rel="noopener" class="underline">{{ r.consignment_id }}</a><span v-else>{{ r.consignment_id }}</span></td>
            <td class="p-2">{{ r.recipient_name }}<br><span class="text-xs text-muted">{{ r.recipient_phone }}</span></td>
            <td class="p-2 text-right">{{ taka(r.cod_amount ?? 0) }}</td>
            <td class="p-2">{{ r.status }}<template v-if="r.reason"><br><span class="text-xs text-muted">{{ r.reason }}</span></template></td>
            <td class="p-2 text-xs text-muted">{{ d(r.updated_at) }}</td>
          </tr>
          <tr v-if="!listBusy && !list?.data?.length"><td colspan="6" class="p-3 text-muted">No parcels in this state.</td></tr>
        </tbody>
      </table></div>
      <div v-if="lastPage > 1" class="mt-3 flex items-center gap-3">
        <button class="btn-secondary" :disabled="page <= 1 || listBusy" @click="loadState(open!, page - 1)">Previous</button>
        <span class="hint">Page {{ page }} of {{ lastPage }}</span>
        <button class="btn-secondary" :disabled="page >= lastPage || listBusy" @click="loadState(open!, page + 1)">Next</button>
      </div>
    </div>

    <div v-if="data" class="card mt-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <h2 class="text-2xl">Outcomes of parcels booked</h2>
        <form class="flex flex-wrap items-end gap-2" @submit.prevent="refresh()">
          <input v-model="range.from" type="date" class="inp !w-40" aria-label="From date"><input v-model="range.to" type="date" class="inp !w-40" aria-label="To date">
          <button class="btn-secondary btn-spin" :disabled="pending" :aria-busy="pending">Show</button>
        </form>
      </div>
      <p v-if="!data.stats.ok" class="err" role="alert">{{ data.stats.message }}</p>
      <template v-else>
        <p class="text-sm">{{ stats.total?.count ?? 0 }} parcels · COD {{ taka(stats.total?.cod_amount ?? 0) }} · success {{ stats.success_rate ?? 0 }}% · cancelled {{ stats.cancel_rate ?? 0 }}%</p>
        <ul class="flex flex-col gap-3 text-[14.5px]">
          <li v-for="[k, label] in OUTCOMES" :key="k">
            <div class="flex justify-between gap-3"><span>{{ label }}</span><span>{{ stats[k]?.count ?? 0 }} · {{ taka(stats[k]?.cod_amount ?? 0) }}</span></div>
            <div class="mt-1 h-2.5 bg-cream"><div class="h-full bg-gold transition-[width] duration-500" :style="{ width: `${stats[k]?.share ?? 0}%` }" /></div>
          </li>
        </ul>
        <p class="hint">Counted by booking day. Parcels still in review or on hold are not counted.</p>
      </template>
    </div>
  </section>
</template>
