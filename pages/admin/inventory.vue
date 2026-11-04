<script setup lang="ts">
// Design: AdminInventory board. SRS INV-07/08/10/11/12: stock list with In stock / Low / Out chips,
// adjustment form (lot + remarks required, never below zero), movement history, CSV export.
import type { Dict, Movement, Paged, StockRow } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'inventory.view' })
const auth = useAuthStore()
const canAdjust = computed(() => auth.can('inventory.adjust'))
const { api, errorOf } = useApi()
const config = useRuntimeConfig()

const q = ref('')
const status = ref('')
const category = ref('')
const page = ref(1)
const sel = ref<StockRow | null>(null)
const kind = ref<'stock_in' | 'correction' | 'damage' | 'loss'>('stock_in')
const amount = ref(1)
const lot = ref('')
const remarks = ref('')
const error = ref('')
const message = ref('')

type StockPage = Paged<StockRow> & { summary: { in_stock: number; low: number; out: number; threshold: number } }
const { data: cats } = await useAsyncData('inv-cats', () => api<Dict[]>('/admin/categories/'))
const { data, pending, refresh } = await useAsyncData('inventory', () =>
  api<StockPage>('/admin/inventory/', { query: { q: q.value || undefined, status: status.value || undefined, category: category.value || undefined, page: page.value } }),
{ watch: [page] })
const { data: byCat } = await useAsyncData('inv-by-cat', () => api<{ name: string; units: number }[]>('/admin/inventory/by-category/'))
const catMax = computed(() => Math.max(1, ...(byCat.value ?? []).map((c) => c.units)))
const history = ref<Movement[]>([])
const pages = computed(() => Math.max(1, Math.ceil((data.value?.count ?? 0) / 20)))
const chip: Record<string, string> = { in_stock: 'In stock', low: 'Low', out: 'Out' }
const KINDS = [['stock_in', 'Stock in'], ['correction', 'Correction (+/−)'], ['damage', 'Damage'], ['loss', 'Loss']] as const
const newQty = computed(() => {
  if (!sel.value) return 0
  const d = kind.value === 'stock_in' ? Math.abs(amount.value) : kind.value === 'correction' ? amount.value : -Math.abs(amount.value)
  return sel.value.on_hand + d
})
const exportUrl = computed(() => `${config.public.apiBase}/admin/inventory/export/?${new URLSearchParams({ ...(q.value && { q: q.value }), ...(status.value && { status: status.value }), ...(category.value && { category: category.value }) })}`)

function search() { page.value = 1; refresh() }
async function pick(r: StockRow) {
  sel.value = r; error.value = ''; message.value = ''
  history.value = (await api<Paged<Movement>>('/admin/inventory/movements/', { query: { variant: r.id } })).results
}
async function save() {
  error.value = ''; message.value = ''
  if (!sel.value) return
  try {
    await api('/admin/inventory/adjust/', { method: 'POST', body: { variant: sel.value.id, kind: kind.value, quantity: amount.value, lot_reference: lot.value, remarks: remarks.value } })
    message.value = 'Adjustment saved.'; lot.value = ''; remarks.value = ''
    await refresh(); await refreshNuxtData('inv-by-cat'); const row = data.value?.results.find((r) => r.id === sel.value!.id); if (row) await pick(row)
  } catch (e) {
    const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message
  }
}
const when = (d: string) => new Date(d).toLocaleString()
</script>

<template>
  <section>
    <AdminHeading eyebrow="Inventory & stock" title="Stock levels"><a class="btn-secondary" :href="exportUrl">Export CSV</a></AdminHeading>
    <div class="mb-6 grid gap-3 sm:grid-cols-3">
      <button v-for="k in ([['in_stock', 'In stock'], ['low', `Low (≤ ${data?.summary.threshold ?? 5})`], ['out', 'Out of stock']] as const)" :key="k[0]" class="card text-left" :class="status === k[0] ? '!border-primary' : ''" @click="status = status === k[0] ? '' : k[0]; search()">
        <span class="cap">{{ k[1] }}</span><span class="font-display text-4xl">{{ data?.summary[k[0]] ?? 0 }}</span>
      </button>
    </div>
    <div v-if="byCat?.length" class="card mb-6 !gap-4">
      <h2 class="font-display">Available quantity by category</h2>
      <div v-for="c in byCat" :key="c.name" class="flex items-center gap-4"><span class="w-[130px] flex-none text-[14.5px]">{{ c.name }}</span><div class="h-2.5 flex-1 bg-cream"><div class="h-2.5 bg-gold transition-[width] duration-500" :style="{ width: Math.max(c.units ? 2 : 0, Math.round((c.units / catMax) * 100)) + '%' }" /></div><span class="w-14 text-right text-[14.5px] font-medium">{{ c.units }}</span></div>
    </div>
    <form class="mb-4 flex flex-wrap gap-2" @submit.prevent="search">
      <input v-model="q" class="inp !w-64" placeholder="Search SKU or product…" aria-label="Search stock">
      <select v-model="category" class="inp !w-48" aria-label="Category"><option value="">All categories</option><option v-for="c in cats" :key="c.id" :value="String(c.id)">{{ c.name }}</option></select>
      <select v-model="status" class="inp !w-40" aria-label="Level"><option value="">Any level</option><option value="in_stock">In stock</option><option value="low">Low</option><option value="out">Out</option></select>
      <button class="btn-secondary">Filter</button>
    </form>
    <div class="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div>
        <div class="overflow-x-auto border border-border bg-surface">
          <table class="w-full text-left text-sm">
            <thead><tr class="cap"><th class="p-3">SKU</th><th class="p-3">Product</th><th class="p-3">Category</th><th class="p-3 !text-right">On hand</th><th class="p-3">Level</th><th /></tr></thead>
            <tbody>
              <tr v-if="pending"><td colspan="6" class="p-4 text-muted">Loading…</td></tr>
              <tr v-for="r in data?.results" :key="r.id" class="cursor-pointer" :class="sel?.id === r.id ? '!bg-cream' : ''" @click="pick(r)">
                <td class="whitespace-nowrap p-3 text-[13px] tracking-[0.04em]">{{ r.sku }}</td><td class="min-w-[200px] p-3">{{ r.product }}<br><span class="text-xs text-muted">{{ r.label }}</span></td><td class="p-3">{{ r.category }}</td><td class="p-3 text-right font-medium">{{ r.on_hand }}</td><td class="p-3"><span class="stage" :data-stage="({ in_stock: 'delivered', low: 'draft', out: 'shipping' } as Record<string, string>)[r.level]">{{ chip[r.level] }}</span></td>
                <td class="p-3"><button class="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.12em] text-accent" @click.stop="pick(r)">{{ canAdjust ? 'Adjust' : 'History' }}</button></td>
              </tr>
              <tr v-if="!pending && !data?.results.length"><td colspan="6" class="p-6 text-center text-muted">No stock rows match.</td></tr>
            </tbody>
          </table>
        </div>
        <div class="mt-4 flex items-center gap-3">
          <button class="btn-secondary" :disabled="page <= 1" @click="page--">Previous</button><span class="hint">Page {{ page }} of {{ pages }}</span><button class="btn-secondary" :disabled="page >= pages" @click="page++">Next</button>
        </div>
      </div>
      <div class="flex flex-col gap-6">
        <form v-if="canAdjust" class="card" @submit.prevent="save">
          <h2 class="text-2xl">Adjust inventory</h2>
          <div v-if="sel" class="bg-admin-bg px-4 py-3.5"><div class="cap">Selected SKU</div><div class="mt-1 text-base">{{ sel.sku }} · <b class="font-semibold">{{ sel.on_hand }}</b> on hand</div><div class="text-[13.5px] text-body">{{ sel.product }} · {{ sel.label }}</div></div>
          <p v-else class="bg-admin-bg px-4 py-3.5 text-sm text-muted">Select a SKU from the list to adjust its stock.</p>
          <div class="grid grid-cols-2 border border-ink" role="group" aria-label="Adjustment type"><button v-for="k in KINDS" :key="k[0]" type="button" class="h-11 text-xs font-medium uppercase tracking-[0.1em] transition-colors" :class="kind === k[0] ? 'bg-ink text-bg' : 'hover:bg-cream'" :aria-pressed="kind === k[0]" @click="kind = k[0]">{{ k[1] }}</button></div>
          <div class="fld"><label for="aq">Quantity</label><input id="aq" v-model.number="amount" type="number" class="inp"></div>
          <div class="fld"><label for="ar">Lot / shipment reference{{ kind === 'correction' ? ' (optional)' : '' }}</label><input id="ar" v-model="lot" class="inp" placeholder="e.g. LOT-2611-A or SHIP-0042"></div>
          <div class="fld"><label for="am">Remarks</label><textarea id="am" v-model="remarks" class="inp" placeholder="Reason for this adjustment" /></div>
          <p v-if="sel" class="flex justify-between border-t border-border pt-3.5 text-[14.5px]"><span>New quantity</span><b class="font-semibold" :class="newQty < 0 ? 'text-accent' : ''">{{ newQty }}</b></p>
          <p v-if="error" class="err" role="alert">{{ error }}</p><p v-if="message" class="hint" role="status">{{ message }}</p>
          <button class="btn" :disabled="!sel || newQty < 0" data-track="stock_adjust">Save adjustment</button>
        </form>
        <div v-if="sel" class="card">
          <h2 class="text-2xl">History · {{ sel.sku }}</h2>
          <ol class="flex flex-col gap-2 text-sm">
            <li v-for="m in history" :key="m.id" class="flex flex-col gap-0.5 border-t border-border py-3.5"><div class="flex justify-between text-[14.5px]"><span class="font-medium capitalize">{{ m.reason.replace('_', ' ') }}<span v-if="m.order_ref" class="font-normal text-muted"> · {{ m.order_ref }}</span></span><b class="font-semibold" :style="{ color: m.delta_on_hand > 0 ? 'var(--stage-delivered-fg)' : 'var(--stage-shipping-fg)' }">{{ m.delta_on_hand > 0 ? '+' : '−' }}{{ Math.abs(m.delta_on_hand) }}</b></div><div class="text-[13px] text-muted">{{ when(m.created_at) }}<template v-if="m.user"> · {{ m.user }}</template><template v-if="m.lot_reference"> · {{ m.lot_reference }}</template> · now {{ m.on_hand_after }}</div><div v-if="m.remarks" class="text-[13.5px] text-body">{{ m.remarks }}</div></li>
            <li v-if="!history.length" class="hint">No movements yet.</li>
          </ol>
        </div>
      </div>
    </div>
  </section>
</template>
