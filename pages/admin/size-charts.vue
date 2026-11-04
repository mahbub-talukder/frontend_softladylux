<script setup lang="ts">
// SRS CAT-08: admin-managed size charts. The storefront size calculator reads these rows, so
// editing them changes the suggested sizes. products.view reads, products.manage writes.
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'products.view' })
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf } = useApi()
const charts = ref<Dict[]>([])
const id = ref<number | null>(null)
const rows = ref<Dict>({})
const error = ref('')
const message = ref('')

const current = computed(() => charts.value.find((c) => c.id === id.value))
function pick(c: Dict | undefined) {
  id.value = c?.id ?? null
  rows.value = c ? JSON.parse(JSON.stringify(c.rows)) : {}
  error.value = ''; message.value = ''
}
async function load() {
  charts.value = await api<Dict[]>('/admin/size-charts/')
  pick(charts.value.find((c) => c.id === id.value) ?? charts.value[0])
}
await load()

const num = (v: unknown) => (v === '' || v === null ? NaN : Number(v))
const addBand = () => rows.value.bands.push({ size: 0, min: 0, max: 0 })
const addCup = () => rows.value.cups.push({ cup: '', min: 0, max: 0 })
const addSize = () => rows.value.rows.push({ size: '', bust: [0, 0], waist: [0, 0], hip: [0, 0] })
const drop = (list: Dict[], i: number) => list.splice(i, 1)

function clean(): Dict {
  const r = JSON.parse(JSON.stringify(rows.value))
  if (current.value?.type === 'bra') {
    r.bands = r.bands.map((b: Dict) => ({ size: num(b.size), min: num(b.min), max: num(b.max) }))
    r.cups = r.cups.map((c: Dict) => ({ cup: String(c.cup).trim().toUpperCase(), min: num(c.min), max: num(c.max) }))
  } else {
    r.rows = r.rows.map((x: Dict) => ({ size: String(x.size).trim().toUpperCase(), bust: x.bust.map(num), waist: x.waist.map(num), hip: x.hip.map(num) }))
  }
  return r
}
async function save() {
  error.value = ''; message.value = ''
  try {
    await api(`/admin/size-charts/${id.value}/`, { method: 'PATCH', body: { rows: clean() } })
    message.value = 'Saved. The size guide now uses these values.'; await load()
  } catch (e) {
    const er = errorOf(e)
    error.value = Object.values(er.fields).flat().join(' ') || er.message
  }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Catalogue" title="Size charts">
      <NuxtLink to="/size-guide" class="btn-secondary" target="_blank">Preview size guide</NuxtLink>
      <button v-if="canEdit" class="btn" data-track="size_chart_save" @click="save">Save chart</button>
    </AdminHeading>
    <div class="mb-4 flex border-b border-border" role="tablist">
      <button v-for="c in charts" :key="c.id" class="tab" :aria-pressed="c.id === id" @click="pick(c)">{{ c.name }}</button>
    </div>
    <p class="hint mb-4 max-w-2xl">All measurements are in centimetres. The calculator picks the band from the under-bust measurement and the cup from the bust minus under-bust difference, using these ranges. Keep rows ordered from smallest to largest.</p>

    <div v-if="current?.type === 'bra'" class="grid max-w-3xl gap-6 md:grid-cols-2">
      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Bands</h2>
        <div v-for="(b, i) in rows.bands" :key="i" class="flex items-end gap-2">
          <div class="fld"><label :for="`bs${i}`">Band</label><input :id="`bs${i}`" v-model="b.size" type="number" class="inp !w-20"></div>
          <div class="fld"><label :for="`bmin${i}`">Under bust from</label><input :id="`bmin${i}`" v-model="b.min" type="number" class="inp !w-24"></div>
          <div class="fld"><label :for="`bmax${i}`">to</label><input :id="`bmax${i}`" v-model="b.max" type="number" class="inp !w-24"></div>
          <button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove band ${b.size}`" @click="drop(rows.bands, i)">×</button>
        </div>
        <button type="button" class="btn-secondary self-start" @click="addBand">+ Add band</button>
      </fieldset>
      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Cups</h2>
        <div v-for="(c, i) in rows.cups" :key="i" class="flex items-end gap-2">
          <div class="fld"><label :for="`cc${i}`">Cup</label><input :id="`cc${i}`" v-model="c.cup" class="inp !w-20"></div>
          <div class="fld"><label :for="`cmin${i}`">Difference from</label><input :id="`cmin${i}`" v-model="c.min" type="number" class="inp !w-24"></div>
          <div class="fld"><label :for="`cmax${i}`">to</label><input :id="`cmax${i}`" v-model="c.max" type="number" class="inp !w-24"></div>
          <button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove cup ${c.cup}`" @click="drop(rows.cups, i)">×</button>
        </div>
        <button type="button" class="btn-secondary self-start" @click="addCup">+ Add cup</button>
      </fieldset>
    </div>

    <fieldset v-else-if="current" class="card max-w-3xl" :disabled="!canEdit">
      <h2 class="text-2xl">{{ current.name }}</h2>
      <div class="overflow-x-auto"><table class="w-full text-left text-sm">
        <thead><tr class="cap"><th class="p-2">Size</th><th class="p-2" colspan="2">Bust (cm)</th><th class="p-2" colspan="2">Waist (cm)</th><th class="p-2" colspan="2">Hip (cm)</th><th /></tr></thead>
        <tbody>
          <tr v-for="(r, i) in rows.rows" :key="i" class="border-t border-border">
            <td class="p-2"><input v-model="r.size" class="inp !w-20" :aria-label="`Row ${i + 1} size`"></td>
            <template v-for="k in ['bust', 'waist', 'hip']" :key="k">
              <td class="p-1"><input v-model="r[k][0]" type="number" class="inp !w-20" :aria-label="`Row ${i + 1} ${k} from`"></td>
              <td class="p-1"><input v-model="r[k][1]" type="number" class="inp !w-20" :aria-label="`Row ${i + 1} ${k} to`"></td>
            </template>
            <td class="p-2"><button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove row ${i + 1}`" @click="drop(rows.rows, i)">×</button></td>
          </tr>
        </tbody>
      </table></div>
      <button type="button" class="btn-secondary self-start" @click="addSize">+ Add size</button>
    </fieldset>

    <p v-if="error" class="err mt-4" role="alert">{{ error }}</p>
    <p v-if="message" class="hint mt-4" role="status">{{ message }}</p>
  </section>
</template>
