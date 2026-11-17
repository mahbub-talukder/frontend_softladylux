<script setup lang="ts">
// SRS v1.7 CRR-13: ask Steadfast for a pickup rider and list the requests sent from here
// (Steadfast has no list endpoint). The pickup address ID comes from the Steadfast dashboard
// (Pickup Addresses page); the thana list comes from /police_stations.
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'courier.manage' })
const { api, errorOf } = useApi()

const { data: rows, refresh } = await useAsyncData('courier-pickups', () => api<Dict[]>('/admin/courier/pickups/', { toast: false }))
const { data: stations, error: stationsError } = await useAsyncData('courier-stations', () =>
  api<{ id: number; name: string; district: string }[]>('/admin/courier/police-stations/', { toast: false }))

const blank = () => ({ address_id: '', police_station_id: '', address: '', contact_number: '', note: '', estim_qty: '' })
const form = ref<Dict>(blank())
// Start from the last request: most shops always use the same pickup address.
watchEffect(() => {
  const last = rows.value?.[0]
  if (last && !form.value.address) Object.assign(form.value, { address_id: last.address_id, police_station_id: last.police_station_id, address: last.address, contact_number: last.contact_number })
})
const stationFilter = ref('')
const shownStations = computed(() => {
  const q = stationFilter.value.trim().toLowerCase()
  const all = stations.value ?? []
  return (q ? all.filter((s) => `${s.name} ${s.district}`.toLowerCase().includes(q)) : all).slice(0, 300)
})

const { required, integer, min, maxLength, phoneBD, pattern } = rules
const v = useFormValidation(() => form.value, {
  address_id: [required('Enter the pickup address ID from Steadfast.'), integer(), min(1)],
  police_station_id: [required('Choose the thana.')],
  address: [required('Enter the pickup address.'), maxLength(255)],
  contact_number: [required('Enter a contact number.'), phoneBD(), pattern(/^01[3-9]\d{8}$/, 'Use an 11-digit number starting 013–019.')],
  note: [maxLength(500)],
  estim_qty: [integer(), min(1)]
})
const busy = ref(false)
const error = ref('')
const done = ref('')
async function send() {
  error.value = ''; done.value = ''
  if (!v.validateAll()) return
  busy.value = true
  try {
    const f = form.value
    const body: Dict = { address_id: Number(f.address_id), police_station_id: Number(f.police_station_id), address: f.address.trim(), contact_number: f.contact_number.trim() }
    if (f.note?.trim()) body.note = f.note.trim()
    if (f.estim_qty) body.estim_qty = Number(f.estim_qty)
    await api('/admin/courier/pickups/', { method: 'POST', body, successMessage: 'Pickup requested' })
    done.value = 'Pickup requested. A rider will be assigned by Steadfast.'
    form.value.note = ''; form.value.estim_qty = ''
    await refresh()
  } catch (e) {
    const er = errorOf(e); error.value = er.message; v.setServerErrors(er)
  } finally { busy.value = false }
}
const stationName = (id: number) => stations.value?.find((s) => s.id === id)?.name ?? id
const d = (x: string) => new Date(x).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <section>
    <AdminHeading eyebrow="Courier · Steadfast" title="Pickups">
      <NuxtLink to="/admin/courier" class="btn-secondary">← Courier</NuxtLink>
    </AdminHeading>
    <div class="grid gap-6 xl:grid-cols-[minmax(0,520px)_1fr]">
      <form class="card" novalidate @submit.prevent="send">
        <h2 class="text-2xl">Request a pickup</h2>
        <AdminFormField name="address_id" label="Pickup address ID" required hint="From the Pickup Addresses page on the Steadfast dashboard." :error="v.errorFor('address_id')">
          <template #default="s"><input :id="s.id" v-model="form.address_id" type="number" min="1" step="1" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('address_id')" @blur="v.touch('address_id')"></template>
        </AdminFormField>
        <AdminFormField name="police_station_id" label="Thana" required :error="v.errorFor('police_station_id') || (stationsError ? errorOf(stationsError).message : '')">
          <template #default="s">
            <input v-model="stationFilter" class="inp mb-2" placeholder="Type to filter thanas" aria-label="Filter thanas">
            <select :id="s.id" v-model="form.police_station_id" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @change="v.onInput('police_station_id')">
              <option value="">Choose a thana</option>
              <option v-for="st in shownStations" :key="st.id" :value="st.id">{{ st.name }}{{ st.district ? ` · ${st.district}` : '' }}</option>
            </select>
          </template>
        </AdminFormField>
        <AdminFormField name="address" label="Pickup address" required :error="v.errorFor('address')" :counter="{ value: form.address, max: 255 }">
          <template #default="s"><input :id="s.id" v-model="form.address" class="inp" maxlength="255" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('address')" @blur="v.touch('address')"></template>
        </AdminFormField>
        <div class="grid gap-[18px] sm:grid-cols-2">
          <AdminFormField name="contact_number" label="Contact number" required :error="v.errorFor('contact_number')">
            <template #default="s"><input :id="s.id" v-model="form.contact_number" type="tel" class="inp" placeholder="01XXXXXXXXX" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('contact_number')" @blur="v.touch('contact_number')"></template>
          </AdminFormField>
          <AdminFormField name="estim_qty" label="Parcels waiting (approx.)" :error="v.errorFor('estim_qty')">
            <template #default="s"><input :id="s.id" v-model="form.estim_qty" type="number" min="1" step="1" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('estim_qty')" @blur="v.touch('estim_qty')"></template>
          </AdminFormField>
        </div>
        <AdminFormField name="note" label="Note for the rider" :error="v.errorFor('note')" :counter="{ value: form.note, max: 500 }">
          <template #default="s"><textarea :id="s.id" v-model="form.note" class="inp" maxlength="500" rows="2" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('note')" /></template>
        </AdminFormField>
        <button class="btn btn-spin self-start" :disabled="busy" :aria-busy="busy" data-track="courier_pickup">Request pickup</button>
        <p v-if="done" class="hint text-ink" role="status">{{ done }}</p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
      </form>
      <div class="card">
        <h2 class="text-2xl">Requests sent from here</h2>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm">
          <thead><tr class="cap"><th class="p-2">When</th><th class="p-2">Address</th><th class="p-2">Thana</th><th class="p-2">Parcels</th><th class="p-2">Status</th><th class="p-2">By</th></tr></thead>
          <tbody>
            <tr v-for="r in rows ?? []" :key="r.id" class="border-t border-border">
              <td class="p-2 text-xs">{{ d(r.created_at) }}</td>
              <td class="p-2">{{ r.address }}<br><span class="text-xs text-muted">ID {{ r.address_id }} · {{ r.contact_number }}</span></td>
              <td class="p-2">{{ stationName(r.police_station_id) }}</td>
              <td class="p-2">{{ r.estim_qty ?? '—' }}</td>
              <td class="p-2">{{ r.status || '—' }}</td>
              <td class="p-2 text-xs">{{ r.requested_by_name ?? '' }}</td>
            </tr>
            <tr v-if="!rows?.length"><td colspan="6" class="p-3 text-muted">No pickups requested yet.</td></tr>
          </tbody>
        </table></div>
      </div>
    </div>
  </section>
</template>
