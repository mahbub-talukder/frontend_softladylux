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
    await refresh(); const row = data.value?.results.find((r) => r.id === sel.value!.id); if (row) await pick(row)
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
            <thead><tr class="cap"><th class="p-3">SKU</th><th class="p-3">Product</th><th class="p-3">Category</th><th class="p-3">On hand</th><th class="p-3">Level</th><th /></tr></thead>
            <tbody>
              <tr v-if="pending"><td colspan="6" class="p-4 text-muted">Loading…</td></tr>
              <tr v-for="r in data?.results" :key="r.id" class="border-t border-border" :class="sel?.id === r.id ? 'bg-primary-soft' : ''">
                <td class="whitespace-nowrap p-3 text-[13px] tracking-[0.04em]">{{ r.sku }}</td><td class="p-3">{{ r.product }}<br><span class="hint">{{ r.label }}</span></td><td class="p-3">{{ r.category }}</td><td class="p-3">{{ r.on_hand }}</td><td class="p-3"><span class="stage" :data-stage="({ in_stock: 'delivered', low: 'draft', out: 'shipping' } as Record<string, string>)[r.level]">{{ chip[r.level] }}</span></td>
                <td class="p-3"><button class="underline" @click="pick(r)">{{ canAdjust ? 'Adjust' : 'History' }}</button></td>
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
          <p v-if="sel" class="text-sm">Selected SKU <b>{{ sel.sku }}</b> · <b>{{ sel.on_hand }}</b> on hand<br><span class="hint">{{ sel.product }}</span></p>
          <p v-else class="hint">Select a SKU to adjust.</p>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Adjustment type"><button v-for="k in KINDS" :key="k[0]" type="button" class="min-h-touch border px-3 text-sm" :class="kind === k[0] ? 'border-primary bg-primary text-primary-contrast' : 'border-border'" :aria-pressed="kind === k[0]" @click="kind = k[0]">{{ k[1] }}</button></div>
          <div class="fld"><label for="aq">Quantity</label><input id="aq" v-model.number="amount" type="number" class="inp"></div>
          <div class="fld"><label for="ar">Lot / shipment reference{{ kind === 'correction' ? ' (optional)' : '' }}</label><input id="ar" v-model="lot" class="inp" placeholder="e.g. LOT-2611-A or SHIP-0042"></div>
          <div class="fld"><label for="am">Remarks</label><textarea id="am" v-model="remarks" class="inp" placeholder="Reason for this adjustment" /></div>
          <p v-if="sel" class="text-sm">New quantity <b :class="newQty < 0 ? 'text-accent' : ''">{{ newQty }}</b></p>
          <p v-if="error" class="err" role="alert">{{ error }}</p><p v-if="message" class="hint" role="status">{{ message }}</p>
          <button class="btn" :disabled="!sel || newQty < 0" data-track="stock_adjust">Save adjustment</button>
        </form>
        <div v-if="sel" class="card">
          <h2 class="text-2xl">History · {{ sel.sku }}</h2>
          <ol class="flex flex-col gap-2 text-sm">
            <li v-for="m in history" :key="m.id" class="border-b border-border pb-2"><b>{{ m.delta_on_hand > 0 ? '+' : '' }}{{ m.delta_on_hand }}</b> → {{ m.on_hand_after }} · {{ m.reason.replace('_', ' ') }}<span v-if="m.order_ref"> · {{ m.order_ref }}</span><br><span class="hint">{{ when(m.created_at) }}<template v-if="m.user"> · {{ m.user }}</template><template v-if="m.lot_reference"> · {{ m.lot_reference }}</template></span><br>{{ m.remarks }}</li>
            <li v-if="!history.length" class="hint">No movements yet.</li>
          </ol>
        </div>
      </div>
    </div>
  </section>
</template>
