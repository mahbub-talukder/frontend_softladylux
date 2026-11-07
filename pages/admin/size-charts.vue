<script setup lang="ts">
// SRS CAT-08: admin-managed size charts. The storefront size calculator reads these rows, so
// editing them changes the suggested sizes. products.view reads, products.manage writes.
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'products.view' })
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf, toast } = useApi()
const charts = ref<Dict[]>([])
const id = ref<number | null>(null)
const rows = ref<Dict>({})
const error = ref('')
const message = ref('')
const showProblems = ref(false)
const busy = ref(false)

const current = computed(() => charts.value.find((c) => c.id === id.value))
function pick(c: Dict | undefined) {
  id.value = c?.id ?? null
  rows.value = c ? JSON.parse(JSON.stringify(c.rows)) : {}
  error.value = ''; message.value = ''; showProblems.value = false
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
// CAT-08 / UI-06: mirror of the server's chart rules, shown as one list so every problem is visible before saving:
// every range is 0 < from <= to, labels are filled in, and rows run from smallest to largest.
const problems = computed<string[]>(() => {
  const out: string[] = []
  const r = rows.value
  const good = (a: unknown, b: unknown) => { const x = num(a), y = num(b); return !Number.isNaN(x) && !Number.isNaN(y) && x > 0 && x <= y }
  if (current.value?.type === 'bra') {
    if (!r.bands?.length) out.push('Add at least one band.')
    ;(r.bands ?? []).forEach((b: Dict, i: number) => {
      if (!Number.isInteger(num(b.size)) || num(b.size) <= 0) out.push(`Band row ${i + 1}: enter the band size (e.g. 34).`)
      if (!good(b.min, b.max)) out.push(`Band ${b.size || i + 1}: "from" must be above 0 and not more than "to".`)
    })
    if (!r.cups?.length) out.push('Add at least one cup.')
    ;(r.cups ?? []).forEach((c: Dict, i: number) => {
      if (!String(c.cup ?? '').trim()) out.push(`Cup row ${i + 1}: enter the cup letter.`)
      if (!good(c.min, c.max)) out.push(`Cup ${String(c.cup || i + 1).toUpperCase()}: "from" must be above 0 and not more than "to".`)
      if (i && num(c.max) < num(r.cups[i - 1].max)) out.push(`Cup ${String(c.cup || i + 1).toUpperCase()}: keep cups ordered from smallest to largest.`)
    })
  } else if (current.value) {
    if (!r.rows?.length) out.push('Add at least one size.')
    ;(r.rows ?? []).forEach((x: Dict, i: number) => {
      const name = String(x.size ?? '').trim() || `row ${i + 1}`
      if (!String(x.size ?? '').trim()) out.push(`Row ${i + 1}: enter the size label.`)
      for (const k of ['bust', 'waist', 'hip']) if (!good(x[k][0], x[k][1])) out.push(`${name}: ${k} "from" must be above 0 and not more than "to".`)
      if (i && num(x.hip[1]) < num(r.rows[i - 1].hip[1])) out.push(`${name}: keep sizes ordered from smallest to largest hip.`)
    })
  }
  return out
})
async function save() {
  error.value = ''; message.value = ''; showProblems.value = true
  if (problems.value.length) { toast.error('Please fix the size chart', problems.value.slice(0, 3)); return }
  busy.value = true
  try {
    await api(`/admin/size-charts/${id.value}/`, { method: 'PATCH', body: { rows: clean() }, successMessage: 'Size chart saved', toast: true })
    message.value = 'Saved. The size guide now uses these values.'; showProblems.value = false; await load()
  } catch (e) {
    const er = errorOf(e)
    error.value = er.flat.join(' ')
  } finally { busy.value = false }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Catalogue" title="Size charts">
      <NuxtLink to="/size-guide" class="btn-secondary" target="_blank">Preview size guide</NuxtLink>
      <button v-if="canEdit" class="btn btn-spin" :disabled="busy" :aria-busy="busy" data-track="size_chart_save" @click="save">Save chart</button>
    </AdminHeading>
    <div class="mb-4 flex border-b border-border" role="tablist">
      <button v-for="c in charts" :key="c.id" class="tab" :aria-pressed="c.id === id" @click="pick(c)">{{ c.name }}</button>
    </div>
    <p class="hint mb-4 max-w-2xl">All fields on this page are required. All measurements are in centimetres. The calculator picks the band from the under-bust measurement and the cup from the bust minus under-bust difference, using these ranges. Keep rows ordered from smallest to largest.</p>

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

    <ul v-if="showProblems && problems.length" class="err mt-4 list-disc pl-5" role="alert" aria-label="Problems to fix"><li v-for="m in problems" :key="m">{{ m }}</li></ul>
    <p v-if="error" class="err mt-4" role="alert">{{ error }}</p>
    <p v-if="message" class="hint mt-4" role="status">{{ message }}</p>
  </section>
</template>
