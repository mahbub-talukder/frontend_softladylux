<script setup lang="ts">
// Design: AdminProducts board (list). SRS ADM-03, ADM-07 (server-side search/pagination, states),
// CAT-15 (bulk actions, CSV export). CSV import is later (CAT-16) so there is no Import button.
import type { Dict, Paged } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'products.view' })
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf } = useApi()
const config = useRuntimeConfig()

const q = ref('')
const category = ref('')
const status = ref('')
const page = ref(1)
const selected = ref<number[]>([])
const bulkCategory = ref('')
const bulkSub = ref('')
const message = ref('')
const error = ref('')

const { data: cats } = await useAsyncData('admin-cats', () => api<Dict[]>('/admin/categories/'))
const { data, pending, refresh } = await useAsyncData('admin-products', () =>
  api<Paged<Dict>>('/admin/products/', { query: { q: q.value || undefined, category: category.value || undefined, status: status.value || undefined, page: page.value } }),
{ watch: [page] })
const pages = computed(() => Math.max(1, Math.ceil((data.value?.count ?? 0) / 20)))
const subs = computed(() => cats.value?.find((c) => String(c.id) === bulkCategory.value)?.subcategories.filter((s: Dict) => s.is_active) ?? [])
const allOn = computed(() => !!data.value?.results.length && data.value.results.every((r) => selected.value.includes(r.id)))

function search() { page.value = 1; selected.value = []; refresh() }
const toggleAll = () => { selected.value = allOn.value ? [] : data.value!.results.map((r) => r.id) }
const exportUrl = computed(() => `${config.public.apiBase}/admin/products/export/?${new URLSearchParams({ ...(q.value && { q: q.value }), ...(category.value && { category: category.value }), ...(status.value && { status: status.value }) })}`)

async function bulk(action: string, extra: Dict = {}) {
  error.value = ''; message.value = ''
  if (!selected.value.length) { error.value = 'Select at least one product.'; return }
  try {
    const r = await api<{ updated: number }>('/admin/products/bulk/', { method: 'POST', body: { ids: selected.value, action, ...extra } })
    message.value = `${r.updated} product(s) updated.`; selected.value = []; await refresh()
  } catch (e) { const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Catalogue" title="Products">
      <a class="btn-secondary" :href="exportUrl">Export CSV</a>
      <NuxtLink v-if="canEdit" to="/admin/products/new" class="btn">+ Add product</NuxtLink>
    </AdminHeading>
    <form class="mb-4 flex flex-wrap gap-3" @submit.prevent="search">
      <input v-model="q" class="inp !w-64" placeholder="Search by name or SKU…" aria-label="Search products">
      <select v-model="category" class="inp !w-48" aria-label="Category"><option value="">All categories</option><option v-for="c in cats" :key="c.id" :value="String(c.id)">{{ c.name }}</option></select>
      <select v-model="status" class="inp !w-40" aria-label="Status"><option value="">Any status</option><option value="active">Active</option><option value="draft">Draft</option></select>
      <button class="btn-secondary">Filter</button>
    </form>

    <div v-if="canEdit && selected.length" class="card mb-4">
      <p class="text-sm">{{ selected.length }} selected</p>
      <div class="flex flex-wrap items-end gap-2">
        <button class="btn-secondary" @click="bulk('activate')">Activate</button>
        <button class="btn-secondary" @click="bulk('deactivate')">Deactivate</button>
        <button class="btn-secondary" @click="bulk('set_flag', { flag: 'is_new', value: true })">Mark new</button>
        <button class="btn-secondary" @click="bulk('set_flag', { flag: 'is_signature', value: true })">Mark signature</button>
        <button class="btn-secondary" @click="bulk('set_flag', { flag: 'is_offer', value: true })">Mark offer</button>
        <select v-model="bulkCategory" class="inp !w-44" aria-label="Move to category"><option value="">Move to category…</option><option v-for="c in cats" :key="c.id" :value="String(c.id)">{{ c.name }}</option></select>
        <select v-if="subs.length" v-model="bulkSub" class="inp !w-44" aria-label="New sub-category"><option value="">Sub-category…</option><option v-for="s in subs" :key="s.id" :value="String(s.id)">{{ s.name }}</option></select>
        <button class="btn" :disabled="!bulkCategory" @click="bulk('set_category', { category: Number(bulkCategory), subcategory: bulkSub ? Number(bulkSub) : null })">Move</button>
      </div>
    </div>
    <p v-if="error" class="err mb-3" role="alert">{{ error }}</p>
    <p v-if="message" class="hint mb-3" role="status">{{ message }}</p>

    <div class="overflow-x-auto border border-border bg-surface">
      <table class="w-full text-left text-sm">
        <thead><tr class="cap"><th class="p-3"><input type="checkbox" aria-label="Select all" :checked="allOn" @change="toggleAll"></th><th class="p-3">Product</th><th class="p-3">Category</th><th class="p-3">UoM</th><th class="p-3">Price</th><th class="p-3">In stock</th><th class="p-3">Status</th><th /></tr></thead>
        <tbody>
          <tr v-if="pending"><td colspan="8" class="p-4 text-muted">Loading…</td></tr>
          <tr v-for="p in data?.results" :key="p.id" class="border-t border-border">
            <td class="p-3"><input v-model="selected" type="checkbox" :value="p.id" :aria-label="`Select ${p.name}`"></td>
            <td class="flex items-center gap-3 p-3"><NuxtImg v-if="p.image" format="webp" :src="mediaSrc(p.image)" :alt="p.name" width="36" height="48" class="h-12 w-9 object-cover" /><span class="h-12 w-9 bg-cream" :class="p.image ? 'hidden' : ''" />{{ p.name }}</td>
            <td class="p-3">{{ p.category_name }}<span v-if="p.subcategory_name" class="hint"> · {{ p.subcategory_name }}</span></td>
            <td class="p-3">{{ p.uom }}</td>
            <td class="p-3">{{ taka(p.price) }}<span v-if="p.discount_pct" class="hint"> −{{ p.discount_pct }}%</span></td>
            <td class="p-3">{{ p.stock ?? 0 }}</td>
            <td class="p-3"><span class="stage" :data-stage="p.is_active ? 'delivered' : 'cancelled'">{{ p.is_active ? 'Active' : 'Draft' }}</span></td>
            <td class="p-3"><NuxtLink :to="`/admin/products/${p.id}`" class="underline">{{ canEdit ? 'Edit' : 'View' }}</NuxtLink></td>
          </tr>
          <tr v-if="!pending && !data?.results.length"><td colspan="8" class="p-6 text-center text-muted">No products found.</td></tr>
        </tbody>
      </table>
    </div>
    <div class="mt-4 flex items-center gap-3">
      <button class="btn-secondary" :disabled="page <= 1" @click="page--">Previous</button>
      <span class="hint">Page {{ page }} of {{ pages }} · {{ data?.count ?? 0 }} products</span>
      <button class="btn-secondary" :disabled="page >= pages" @click="page++">Next</button>
    </div>
  </section>
</template>
