<script setup lang="ts">
// SRS v1.7 CRR-14: Steadfast return requests, newest first, ten to a page, with the parcel each
// one is about. New requests are raised from the order detail panel ("Ask Steadfast to return").
// Steadfast does not document this list's shape, so fields are read defensively.
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'courier.view' })
const { api, errorOf } = useApi()

const page = ref(1)
const { data, pending, error } = await useAsyncData('courier-returns', () =>
  api<Dict>('/admin/courier/returns/', { query: { page: page.value }, toast: false }), { watch: [page] })
const rows = computed<Dict[]>(() => {
  const d = data.value
  if (Array.isArray(d)) return d
  const inner = d?.data
  if (Array.isArray(inner)) return inner
  if (inner && Array.isArray(inner.data)) return inner.data // Laravel paginator inside `data`
  return Array.isArray(d?.return_requests) ? d!.return_requests : []
})
const lastPage = computed(() => Number(data.value?.last_page ?? data.value?.data?.last_page ?? data.value?.meta?.last_page ?? 1))

const openId = ref<number | null>(null)
const detail = ref<Dict | null>(null)
const detailError = ref('')
async function show(id: number) {
  if (openId.value === id) { openId.value = null; return }
  openId.value = id; detail.value = null; detailError.value = ''
  try { detail.value = await api<Dict>(`/admin/courier/returns/${id}/`, { toast: false }) } catch (e) { detailError.value = errorOf(e).message }
}
const parcel = (r: Dict | null): Dict => (r?.consignment ?? r?.data?.consignment ?? {}) as Dict
const d = (x: string) => (x ? new Date(x).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '')
</script>

<template>
  <section>
    <AdminHeading eyebrow="Courier · Steadfast" title="Return requests">
      <NuxtLink to="/admin/courier" class="btn-secondary">← Courier</NuxtLink>
    </AdminHeading>
    <p class="hint mb-4">To ask for a parcel back, open the order and use <b>Ask Steadfast to return</b>. Statuses: pending, approved, processing, completed, cancelled.</p>
    <p v-if="error" class="err mb-4" role="alert">{{ errorOf(error).message }}</p>
    <div class="card">
      <div class="overflow-x-auto"><table class="w-full text-left text-sm">
        <thead><tr class="cap"><th class="p-2">Request</th><th class="p-2">Consignment</th><th class="p-2">Reason</th><th class="p-2">Status</th><th class="p-2">Raised</th><th /></tr></thead>
        <tbody>
          <tr v-if="pending"><td colspan="6" class="p-3 text-muted">Loading…</td></tr>
          <template v-for="r in (pending ? [] : rows)" :key="r.id">
            <tr class="border-t border-border">
              <td class="p-2 font-semibold">#{{ r.id }}</td>
              <td class="p-2">{{ r.consignment_id ?? parcel(r).consignment_id ?? '—' }}<template v-if="parcel(r).invoice"><br><span class="text-xs text-muted">{{ parcel(r).invoice }}</span></template></td>
              <td class="p-2">{{ r.reason || '—' }}</td>
              <td class="p-2">{{ r.status }}</td>
              <td class="p-2 text-xs">{{ d(r.created_at) }}</td>
              <td class="p-2"><button type="button" class="hint underline" :aria-expanded="openId === r.id" @click="show(r.id)">{{ openId === r.id ? 'Hide' : 'Details' }}</button></td>
            </tr>
            <tr v-if="openId === r.id"><td colspan="6" class="bg-admin-bg p-3 text-sm">
              <p v-if="detailError" class="err" role="alert">{{ detailError }}</p>
              <p v-else-if="!detail" class="text-muted">Loading…</p>
              <dl v-else class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <template v-for="[k, label] in [['invoice', 'Invoice'], ['recipient_name', 'Recipient'], ['recipient_phone', 'Phone'], ['cod_amount', 'COD'], ['status', 'Parcel status'], ['tracking_code', 'Tracking code']]" :key="k">
                  <template v-if="parcel(detail)[k] != null"><dt class="text-muted">{{ label }}</dt><dd>{{ parcel(detail)[k] }}</dd></template>
                </template>
              </dl>
            </td></tr>
          </template>
          <tr v-if="!pending && !rows.length"><td colspan="6" class="p-3 text-muted">No return requests.</td></tr>
        </tbody>
      </table></div>
      <div class="mt-3 flex items-center gap-3">
        <button class="btn-secondary" :disabled="page <= 1 || pending" @click="page--">Previous</button>
        <span class="hint">Page {{ page }}<template v-if="lastPage > 1"> of {{ lastPage }}</template></span>
        <button class="btn-secondary" :disabled="pending || (lastPage > 1 ? page >= lastPage : rows.length < 10)" @click="page++">Next</button>
      </div>
    </div>
  </section>
</template>
