<script setup lang="ts">
// Design: AdminProducts board (form). SRS ADM-03, CAT-02..04, CAT-19: the Sub-category drop-down
// lists only the active sub-categories of the chosen category, is disabled until a category is
// chosen, is required when the category has any, and clears when the category changes.
// Flow: Save draft -> add images -> Publish (a product needs an image and a variant to be published, CAT-04).
// UI-06: every field says "*" (mandatory) or "(Optional)"; errors are inline and keep the user's input.
// CAT-03 / ADM-03: the SKU of a new variant is previewed live from product + colour + size (server stays authoritative).
// WEB-09 / §10: photos are checked in the browser (type, 5 MB, 300 px) and uploaded one by one with per-file results.
import { COLOUR_PRESETS, DEFAULT_SWATCH, SIZE_PRESETS } from '~/utils/variantPresets'
import { checkImageFile, PRODUCT_MIN_SIDE } from '~/utils/imageCheck'
import { makeSku, SKU_MAX, uniqueSku } from '~/utils/sku'
import type { Dict } from '~/types/api'

// key: /new -> /{id} after create must remount the page, so it loads the saved product (and any carried-over photos).
definePageMeta({ layout: 'admin', permission: 'products.view', key: (r) => String(r.params.id) })
const route = useRoute()
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf, toast } = useApi()
const isNew = computed(() => route.params.id === 'new')

const { data: cats } = await useAsyncData('admin-cats-form', () => api<Dict[]>('/admin/categories/'))
const blank = (): Dict => ({
  name: '', slug: '', category: null, subcategory: null, short_desc: '', description: '', care_notes: '',
  collection: '', uom: 'pc', price: '', compare_at_price: '', sku_prefix: '', is_active: false, is_new: false,
  is_signature: false, is_offer: false, tags: [], seo_title: '', seo_description: '', variants: [], images: []
})
const form = ref<Dict>(blank())
const tags = ref('')
const error = ref('')
const busy = ref(false)
const publishOnSave = ref(false) // new product: the Status switch

// ---- photos waiting to upload (new files + any that failed on a previous save)
interface Pending { key: string; file: File; url: string; state: 'ready' | 'uploading' | 'failed' | 'invalid'; error: string }
const pending = ref<Pending[]>([])
const carried = useState<Record<number, Pending[]>>('product-carried-uploads', () => ({}))
const readyCount = computed(() => pending.value.filter((p) => p.state === 'ready' || p.state === 'failed').length)

async function load() {
  if (isNew.value) return
  const p = await api<Dict>(`/admin/products/${route.params.id}/`)
  form.value = p; tags.value = (p.tags || []).join(', ')
  // Photos that failed right after the product was created come along so the admin can retry them here.
  const left = carried.value[Number(route.params.id)]
  if (left?.length) { pending.value = left; Reflect.deleteProperty(carried.value, Number(route.params.id)) }
}
await load()
onBeforeUnmount(() => pending.value.forEach((p) => URL.revokeObjectURL(p.url)))

const subOptions = computed(() => cats.value?.find((c) => c.id === form.value.category)?.subcategories.filter((s: Dict) => s.is_active) ?? [])
function onCategory() { form.value.subcategory = null; v.onInput('category'); v.onInput('subcategory') } // CAT-19: changing the category clears it

// ---- field validation (mirrors ProductSerializer; the server stays authoritative)
const { required, maxLength, pattern, slug, min, max, decimal, custom } = rules
const v = useFormValidation(() => form.value, {
  name: [required('Enter the product name.'), maxLength(160)],
  slug: [slug(), maxLength(180)],
  category: [required('Choose a category.')],
  subcategory: [custom((x) => (subOptions.value.length && (x === null || x === '' || x === undefined) ? 'Choose a sub-category for this category.' : null))],
  short_desc: [maxLength(300)],
  collection: [maxLength(80)],
  sku_prefix: [maxLength(20), pattern(/^[A-Z0-9-]+$/, 'Use capital letters, digits and dashes only.')],
  price: [required('Enter the price.'), min(0, 'Price cannot be negative.'), max(99999999.99, 'Price is too large.'), decimal(2)],
  compare_at_price: [min(0, 'Cannot be negative.'), decimal(2), custom((x, all) => (x !== '' && x != null && Number(x) <= Number(all.price) ? 'Must be higher than the price.' : null))],
  seo_title: [maxLength(120)],
  seo_description: [maxLength(300)]
})
const fieldIn = (k: string) => { v.onInput(k) }
function upperPrefix() { form.value.sku_prefix = String(form.value.sku_prefix || '').toUpperCase(); fieldIn('sku_prefix') }

// ---- variants
// Chips: pick sizes and colours, then "Add rows" creates each missing size x colour row.
const unique = (a: string[]) => [...new Set(a.filter(Boolean))]
const pickedSizes = ref<string[]>(unique(form.value.variants.map((x: Dict) => x.size_label)))
const pickedColours = ref<{ name: string; hex: string }[]>(
  unique(form.value.variants.map((x: Dict) => x.color_name)).map((n) => ({
    name: n, hex: form.value.variants.find((x: Dict) => x.color_name === n && x.color_hex)?.color_hex || COLOUR_PRESETS.find((p) => p.name === n)?.hex || DEFAULT_SWATCH
  }))
)
const extraSizes = computed(() => pickedSizes.value.filter((z) => !SIZE_PRESETS.includes(z)))
const extraColours = computed(() => pickedColours.value.filter((c) => !COLOUR_PRESETS.some((p) => p.name === c.name)))
const customSize = ref('')
const customColour = ref('')
const picker = ref<HTMLInputElement | null>(null)
const pickingName = ref('')
const toggleSize = (z: string) => { pickedSizes.value = pickedSizes.value.includes(z) ? pickedSizes.value.filter((x) => x !== z) : [...pickedSizes.value, z] }
const isColour = (n: string) => pickedColours.value.some((c) => c.name === n)
function toggleColour(c: { name: string; hex: string }) {
  pickedColours.value = isColour(c.name) ? pickedColours.value.filter((x) => x.name !== c.name) : [...pickedColours.value, { ...(pickedColours.value.find((x) => x.name === c.name) ?? c) }]
}
const hexOf = (c: { name: string; hex: string }) => pickedColours.value.find((x) => x.name === c.name)?.hex ?? c.hex
function addCustomSize() { const s = customSize.value.trim(); if (s && !pickedSizes.value.includes(s)) pickedSizes.value.push(s); customSize.value = '' }
function addCustomColour() { const s = customColour.value.trim(); if (s && !isColour(s)) pickedColours.value.push({ name: s, hex: DEFAULT_SWATCH }); customColour.value = '' }
// Double-click a picked colour chip to open the colour picker and change its swatch.
function editSwatch(c: { name: string; hex: string }) {
  if (!isColour(c.name)) toggleColour(c)
  pickingName.value = c.name
  nextTick(() => { const el = picker.value; if (!el) return; el.value = hexOf(c); try { el.showPicker() } catch { el.click() } })
}
function onSwatch(e: Event) {
  const hex = (e.target as HTMLInputElement).value
  const c = pickedColours.value.find((x) => x.name === pickingName.value)
  if (c) c.hex = hex
  for (const r of form.value.variants) if (r.color_name === pickingName.value) r.color_hex = hex
}
const variantTotal = computed(() => Math.max(pickedSizes.value.length, 1) * Math.max(pickedColours.value.length, 1))
const newRow = (size = '', colour = '', hex = ''): Dict => ({ size_label: size, color_name: colour, color_hex: hex, sku: '', sku_auto: true, price_override: null, on_hand: 0, is_active: true })
const addVariant = () => form.value.variants.push(newRow())
const sameCombo = (a: Dict, size: string, colour: string) => (a.size_label || '').trim().toLowerCase() === size.trim().toLowerCase() && (a.color_name || '').trim().toLowerCase() === colour.trim().toLowerCase()
function generate() {
  const sizes = pickedSizes.value
  const colours = pickedColours.value
  for (const c of colours.length ? colours : [{ name: '', hex: '' }]) for (const s of sizes.length ? sizes : ['']) {
    if (!form.value.variants.some((r: Dict) => r.is_active !== false && sameCombo(r, s, c.name))) form.value.variants.push(newRow(s, c.name, c.hex))
  }
}
const colourNames = computed<string[]>(() => [...new Set<string>(form.value.variants.map((r: Dict) => r.color_name).filter(Boolean))])
const activeVariants = computed(() => form.value.variants.filter((r: Dict) => r.is_active !== false))

// Live SKU preview: new rows whose SKU is still "auto" follow product name / SKU prefix / colour / size.
// Saved SKUs never change by themselves; changing size or colour of a saved row offers an explicit "Use ..." action.
function recomputeSkus() {
  const rows = form.value.variants as Dict[]
  const taken = new Set<string>(rows.filter((r) => !r.sku_auto && r.sku && r.is_active !== false).map((r) => r.sku))
  for (const r of rows) {
    if (!r.sku_auto || r.is_active === false) continue
    const sku = uniqueSku(makeSku(form.value.sku_prefix, form.value.name, r.color_name, r.size_label), taken)
    taken.add(sku)
    if (r.sku !== sku) r.sku = sku
  }
}
watch(
  () => JSON.stringify([form.value.name, form.value.sku_prefix, form.value.variants.map((r: Dict) => [r.id, r.is_active, r.size_label, r.color_name, r.sku_auto, r.sku_auto ? '' : r.sku])]),
  recomputeSkus, { immediate: true }
)
const suggestion = (r: Dict) => uniqueSku(makeSku(form.value.sku_prefix, form.value.name, r.color_name, r.size_label), (form.value.variants as Dict[]).filter((o) => o !== r && o.is_active !== false).map((o) => o.sku).filter(Boolean))
const canSuggest = (r: Dict) => !!r.id && r.sku && suggestion(r) !== r.sku
function onSkuInput(r: Dict) {
  r.sku = String(r.sku || '').toUpperCase().replace(/[^A-Z0-9-]/g, '')
  if (!r.id) r.sku_auto = !r.sku // typing makes it custom; clearing it goes back to auto
}
function skuAuto(r: Dict) { r.sku_auto = true; recomputeSkus() }

// Row-level problems shown under the row (client rules + server `variants[n].*` messages).
const payloadRows = computed(() => (form.value.variants as Dict[]).filter((r) => r.is_active !== false))
function rowProblems(r: Dict): string[] {
  const out: string[] = []
  const rows = payloadRows.value
  const pos = rows.indexOf(r)
  if (r.sku && !r.sku_auto) {
    if (!/^[A-Z0-9-]+$/.test(r.sku)) out.push('SKU: capital letters, digits and dashes only.')
    else if (r.sku.length > SKU_MAX) out.push(`SKU: at most ${SKU_MAX} characters.`)
    else if (rows.some((o) => o !== r && o.sku && o.sku.toUpperCase() === r.sku.toUpperCase())) out.push('SKU: another row already uses it.')
  }
  if ((r.size_label || '').length > 20) out.push('Size: at most 20 characters.')
  if ((r.color_name || '').length > 40) out.push('Colour: at most 40 characters.')
  if (r.price_override !== null && r.price_override !== '' && (Number(r.price_override) < 0 || !Number.isFinite(Number(r.price_override)))) out.push('Price override: enter 0 or more.')
  if (rows.some((o, j) => j < pos && sameCombo(o, r.size_label || '', r.color_name || ''))) out.push('Same size and colour as an earlier row.')
  if (pos >= 0) for (const [k, msgs] of Object.entries(v.server)) if (k.startsWith(`variants[${pos}]`)) out.push(...msgs.map((m) => `${k.split('.').pop()}: ${m}`))
  return out
}
const hasRowServerErrors = computed(() => Object.keys(v.server).some((k) => k.startsWith('variants[')))

// ---- publish pre-checks (CAT-04 / check_publishable) and Status card
const hasPhoto = computed(() => form.value.images.length > 0 || pending.value.some((p) => p.state !== 'invalid'))
const hasVariant = computed(() => isNew.value || activeVariants.value.length > 0) // create makes a default variant when none
const checks = computed(() => [
  { ok: hasPhoto.value, text: 'At least one photo' },
  { ok: hasVariant.value, text: 'At least one active variant' }
])
const canPublish = computed(() => checks.value.every((c) => c.ok))
const published = computed(() => !!form.value.is_active && !isNew.value)
const statusOn = computed(() => (isNew.value ? publishOnSave.value : published.value))

// ---- save
function payload(publish: boolean) {
  const f = form.value
  return {
    name: f.name, slug: f.slug || undefined, category: f.category, subcategory: f.subcategory, short_desc: f.short_desc,
    description: f.description, care_notes: f.care_notes, collection: f.collection, uom: f.uom, price: f.price,
    compare_at_price: f.compare_at_price || null, sku_prefix: f.sku_prefix, is_new: f.is_new, is_signature: f.is_signature,
    is_offer: f.is_offer, tags: tags.value.split(',').map((t) => t.trim()).filter(Boolean), seo_title: f.seo_title,
    seo_description: f.seo_description, is_active: publish ? true : (isNew.value ? false : f.is_active),
    variants: payloadRows.value.map((r) => ({
      id: r.id, size_label: r.size_label, color_name: r.color_name, color_hex: r.color_hex || '',
      // Auto rows send no SKU: the server generates it and de-duplicates across all products.
      sku: r.sku_auto ? '' : (r.sku || ''),
      price_override: r.price_override || null, ...(r.id ? {} : { on_hand: Number(r.on_hand) || 0 })
    }))
  }
}

async function onFiles(e: Event) {
  const input = e.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  for (const file of files) {
    const key = `${file.name}:${file.size}:${file.lastModified}`
    if (pending.value.some((p) => p.key === key)) continue
    const bad = await checkImageFile(file, { minSide: PRODUCT_MIN_SIDE })
    pending.value.push({ key, file, url: URL.createObjectURL(file), state: bad ? 'invalid' : 'ready', error: bad })
  }
}
function dropPending(p: Pending) { URL.revokeObjectURL(p.url); pending.value = pending.value.filter((x) => x !== p) }

/** Uploads one photo per request; keeps failures (with the server's reason) for retry. Returns how many failed. */
async function uploadPending(id: number): Promise<number> {
  const todo = pending.value.filter((p) => p.state === 'ready' || p.state === 'failed')
  let ok = 0
  for (const p of todo) {
    p.state = 'uploading'; p.error = ''
    try {
      const fd = new FormData()
      fd.append('files', p.file)
      fd.append('alt_text', form.value.name)
      await api(`/admin/products/${id}/images/`, { method: 'POST', body: fd, toast: false })
      ok++
      dropPending(p)
    } catch (e) {
      p.state = 'failed'; p.error = errorOf(e).flat.join(' ')
    }
  }
  const failed = todo.length - ok
  if (ok) toast.success(`${ok} photo${ok === 1 ? '' : 's'} uploaded`)
  if (failed) toast.error(`${failed} photo${failed === 1 ? '' : 's'} could not be uploaded`, pending.value.filter((p) => p.state === 'failed').slice(0, 3).map((p) => `${p.file.name}: ${p.error}`))
  return failed
}

function clientCheck(wantPublish: boolean): boolean {
  const okFields = v.validateAll()
  const okRows = !payloadRows.value.some((r) => rowProblems(r).length)
  if (!okFields || !okRows) {
    const lines = [...v.summary.value, ...payloadRows.value.flatMap((r, i) => rowProblems(r).map((m) => `Variant row ${i + 1}: ${m}`))]
    toast.error('Please fix the highlighted fields', lines.slice(0, 3))
    return false
  }
  if (wantPublish && !canPublish.value) {
    toast.error('Not ready to publish', checks.value.filter((c) => !c.ok).map((c) => `Needs: ${c.text.toLowerCase()}`))
    return false
  }
  return true
}

async function save(publish = false) {
  const wantPublish = publish || (isNew.value && publishOnSave.value)
  error.value = ''
  v.reset()
  if (!clientCheck(wantPublish)) return
  busy.value = true
  try {
    let id = Number(route.params.id)
    if (isNew.value) {
      // New product: create as a draft first (photos need an id), upload, then publish if asked.
      const created = await api<Dict>('/admin/products/', { method: 'POST', body: { ...payload(false), is_active: false }, toast: false })
      id = created.id
      let failed = 0
      try { failed = await uploadPending(id) } finally {
        // Whatever happens, leave /new for the edit page, so pressing Save again can never create a duplicate.
        const left = pending.value.filter((p) => p.state === 'failed')
        if (left.length) carried.value[id] = left
        pending.value = []
      }
      let live = false
      if (wantPublish && !failed) {
        try { await api(`/admin/products/${id}/`, { method: 'PATCH', body: { is_active: true }, toast: false }); live = true } catch (e) { toast.error('Saved as a draft, but not published', errorOf(e).flat.slice(0, 3)) }
      }
      toast.success(live ? 'Product created and published' : 'Product created as a draft')
      await navigateTo(`/admin/products/${id}`)
      return
    }
    const failed = await uploadPending(id)
    form.value = await api<Dict>(`/admin/products/${id}/`, { method: 'PATCH', body: payload(wantPublish && !failed), toast: false })
    toast.success(wantPublish && !failed ? 'Product published' : 'Product saved')
    if (wantPublish && failed) toast.info('Saved as a draft', ['Publish once the photos are uploaded.'])
  } catch (e) {
    const er = errorOf(e)
    v.setServerErrors(er); error.value = er.message
    toast.error(isNew.value ? 'Product was not created' : 'Product was not saved', er.flat.slice(0, 3))
  } finally { busy.value = false }
}

async function unpublish() {
  busy.value = true
  try {
    form.value = await api<Dict>(`/admin/products/${route.params.id}/`, { method: 'PATCH', body: { is_active: false }, successMessage: 'Product unpublished' })
  } catch { /* the failure toast is raised by api() */ } finally { busy.value = false }
}
function onStatusSwitch() {
  if (isNew.value) { publishOnSave.value = !publishOnSave.value; return }
  if (published.value) void unpublish()
  else void save(true)
}

// ---- images (existing product). Failures are toasted by api(); the list is refreshed either way.
async function guard(fn: () => Promise<unknown>) { try { await fn() } catch { /* toast already shown */ } }
const setPrimary = (img: Dict) => guard(async () => { await api(`/admin/products/${form.value.id}/images/${img.id}/`, { method: 'PATCH', body: { is_primary: true }, successMessage: 'Cover photo updated' }); await load() })
const setColor = (img: Dict, color: string) => guard(() => api(`/admin/products/${form.value.id}/images/${img.id}/`, { method: 'PATCH', body: { color } }))
const removeImage = (img: Dict) => guard(async () => {
  if (!confirm('Delete this photo?')) return
  await api(`/admin/products/${form.value.id}/images/${img.id}/`, { method: 'DELETE', successMessage: 'Photo deleted' })
  await load() // deleting the last photo unpublishes the product (CAT-04), so reload the status too
})
const moveImage = (i: number, d: number) => guard(async () => {
  const ids = form.value.images.map((x: Dict) => x.id)
  const j = i + d
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  form.value.images = await api<Dict[]>(`/admin/products/${form.value.id}/images/reorder/`, { method: 'POST', body: { ids } })
})
const serverErr = (k: string) => v.server[k]?.join(' ') ?? ''
</script>

<template>
  <section>
    <NuxtLink to="/admin/products" class="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink">← All products</NuxtLink>
    <AdminHeading eyebrow="Catalogue" :title="isNew ? 'Add product' : form.name || 'Edit product'">
      <template v-if="canEdit">
        <button class="btn-secondary btn-spin" :disabled="busy" :aria-busy="busy" data-track="product_save_draft" @click="save(false)">{{ isNew ? (publishOnSave ? 'Save & publish' : 'Save draft') : form.is_active ? 'Save' : 'Save draft' }}</button>
        <button v-if="!isNew && !form.is_active" class="btn" :disabled="busy" data-track="product_publish" @click="save(true)">Publish</button>
        <button v-else-if="!isNew" class="btn-secondary" :disabled="busy" @click="unpublish">Unpublish</button>
      </template>
    </AdminHeading>
    <p class="hint mb-3"><span class="text-accent" aria-hidden="true">*</span> marks mandatory fields. Everything else is optional.</p>
    <p v-if="error" class="err mb-3" role="alert">{{ error }}</p>

    <form class="flex flex-col gap-6 xl:flex-row xl:items-start" novalidate @submit.prevent="save(false)">
      <div class="flex min-w-0 flex-1 flex-col gap-6">
      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Basic information</h2>
        <div class="grid gap-[18px] sm:grid-cols-2">
          <AdminFormField name="name" label="Product name" required :error="v.errorFor('name')" :counter="{ value: form.name, max: 160 }">
            <template #default="s"><input :id="s.id" v-model="form.name" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" autocomplete="off" @input="fieldIn('name')" @blur="v.touch('name')"></template>
          </AdminFormField>
          <AdminFormField name="slug" label="URL slug" hint="Lowercase letters, digits and dashes. Generated from the name when empty." :error="v.errorFor('slug')">
            <template #default="s"><input :id="s.id" v-model="form.slug" class="inp" placeholder="Generated from the name" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('slug')" @blur="v.touch('slug')"></template>
          </AdminFormField>
        </div>
        <AdminFormField name="short_desc" label="Short description" :error="v.errorFor('short_desc')" :counter="{ value: form.short_desc, max: 300 }">
          <template #default="s"><input :id="s.id" v-model="form.short_desc" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('short_desc')" @blur="v.touch('short_desc')"></template>
        </AdminFormField>
        <AdminFormField name="description" label="Description">
          <template #default="s"><textarea :id="s.id" v-model="form.description" class="inp" placeholder="Describe the fit, fabric and feel…" /></template>
        </AdminFormField>
        <AdminFormField name="care_notes" label="Fabric & care">
          <template #default="s"><textarea :id="s.id" v-model="form.care_notes" class="inp" /></template>
        </AdminFormField>
        <div class="grid gap-[18px] sm:grid-cols-2">
          <AdminFormField name="collection" label="Collection / brand" :error="v.errorFor('collection')">
            <template #default="s"><input :id="s.id" v-model="form.collection" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('collection')" @blur="v.touch('collection')"></template>
          </AdminFormField>
          <AdminFormField name="tags" label="Tags" hint="Comma separated">
            <template #default="s"><input :id="s.id" v-model="tags" class="inp"></template>
          </AdminFormField>
        </div>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Category, unit &amp; SKU</h2>
        <div class="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
          <AdminFormField name="category" label="Category" required :error="v.errorFor('category')">
            <template #default="s">
              <select :id="s.id" v-model="form.category" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @change="onCategory" @blur="v.touch('category')"><option :value="null" disabled>Choose a category</option><option v-for="c in cats" :key="c.id" :value="c.id">{{ c.name }}</option></select>
            </template>
          </AdminFormField>
          <AdminFormField name="subcategory" label="Sub-category" :required="subOptions.length > 0" :hint="form.category && !subOptions.length ? 'This category has no sub-categories.' : ''" :error="v.errorFor('subcategory')">
            <template #default="s">
              <select :id="s.id" v-model="form.subcategory" class="inp" :disabled="!form.category || !subOptions.length" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @change="fieldIn('subcategory')" @blur="v.touch('subcategory')">
                <option :value="null">{{ !form.category ? 'Choose a category first' : subOptions.length ? 'Choose a sub-category' : 'No sub-categories' }}</option>
                <option v-for="o in subOptions" :key="o.id" :value="o.id">{{ o.name }}</option></select>
            </template>
          </AdminFormField>
          <AdminFormField name="uom" label="Unit of measure">
            <template #default="s"><select :id="s.id" v-model="form.uom" class="inp"><option value="pc">Piece (pcs)</option><option value="set">Set</option><option value="pack">Pack</option><option value="pair">Pair</option></select></template>
          </AdminFormField>
        </div>
        <AdminFormField name="sku_prefix" label="SKU prefix" class="max-w-sm" hint="Variant SKUs add colour and size. Capital letters, digits and dashes only." :error="v.errorFor('sku_prefix')">
          <template #default="s"><input :id="s.id" v-model="form.sku_prefix" class="inp" placeholder="Generated from the name" maxlength="20" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="upperPrefix" @blur="v.touch('sku_prefix')"></template>
        </AdminFormField>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Pricing</h2>
        <div class="grid gap-[18px] sm:grid-cols-2">
          <AdminFormField name="price" label="Price (৳)" required :error="v.errorFor('price')">
            <template #default="s"><input :id="s.id" v-model="form.price" type="number" min="0" step="0.01" inputmode="decimal" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('price'); fieldIn('compare_at_price')" @blur="v.touch('price')"></template>
          </AdminFormField>
          <AdminFormField name="compare_at_price" label="Compare-at price (৳)" hint="Shown struck through. Must be higher than the price." :error="v.errorFor('compare_at_price')">
            <template #default="s"><input :id="s.id" v-model="form.compare_at_price" type="number" min="0" step="0.01" inputmode="decimal" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('compare_at_price')" @blur="v.touch('compare_at_price')"></template>
          </AdminFormField>
        </div>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Variants</h2>
        <p class="hint">Sizes × colours. Each row has its own SKU and stock. Size, colour, SKU, price override and stock are all optional; at least one active variant is needed to publish. Opening stock is logged as a stock movement; later changes go through Inventory.</p>
        <div class="fld"><label>Sizes <span class="ml-1 text-[11.5px] font-normal normal-case tracking-normal text-muted">(Optional)</span></label>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Sizes">
            <button v-for="z in [...SIZE_PRESETS, ...extraSizes]" :key="z" type="button" class="chip-size !h-11" :aria-pressed="pickedSizes.includes(z)" @click="toggleSize(z)">{{ z }}</button>
            <span class="flex"><input v-model="customSize" class="inp !h-11 !w-28" placeholder="Custom size" aria-label="Custom size" @keydown.enter.prevent="addCustomSize"><button type="button" class="btn-secondary !h-11 !px-3" aria-label="Add custom size" @click="addCustomSize">+</button></span>
          </div>
        </div>
        <div class="fld"><label>Colours <span class="ml-1 text-[11.5px] font-normal normal-case tracking-normal text-muted">(Optional)</span></label>
          <div class="flex flex-wrap gap-2" role="group" aria-label="Colours">
            <button v-for="c in [...COLOUR_PRESETS, ...extraColours]" :key="c.name" type="button" class="chip-size !h-11 gap-2" :aria-pressed="isColour(c.name)" :title="isColour(c.name) ? 'Double-click to change the swatch colour' : 'Click to select'" @click="toggleColour(c)" @dblclick.prevent="editSwatch(c)">
              <span class="h-3.5 w-3.5 rounded-full ring-1 ring-ink/30" :style="{ backgroundColor: hexOf(c) }" />{{ c.name }}
            </button>
            <span class="flex"><input v-model="customColour" class="inp !h-11 !w-32" placeholder="Custom colour" aria-label="Custom colour" @keydown.enter.prevent="addCustomColour"><button type="button" class="btn-secondary !h-11 !px-3" aria-label="Add custom colour" @click="addCustomColour">+</button></span>
          </div>
          <input ref="picker" type="color" class="sr-only" tabindex="-1" aria-label="Swatch colour" @input="onSwatch">
          <p class="hint">Double-click a colour chip to change its swatch.</p>
        </div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p class="text-[13.5px] text-body">{{ variantTotal }} variant{{ variantTotal === 1 ? '' : 's' }} from this selection, each with its own SKU and stock level.</p>
          <button type="button" class="btn-secondary" @click="generate">Add rows</button>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm">
          <thead><tr class="cap"><th class="p-2">Size</th><th class="p-2">Colour</th><th class="p-2">Swatch</th><th class="p-2">SKU</th><th class="p-2">Price override</th><th class="p-2">Stock</th><th /></tr></thead>
          <tbody>
            <template v-for="(r, i) in form.variants" :key="r.id ?? `n${i}`">
              <tr v-show="r.is_active !== false" class="border-t border-border">
                <td class="p-2"><input v-model="r.size_label" class="inp !w-20" maxlength="20" :aria-label="`Row ${i + 1} size`"></td>
                <td class="p-2"><input v-model="r.color_name" class="inp !w-28" maxlength="40" :aria-label="`Row ${i + 1} colour`"></td>
                <td class="p-2"><input v-model="r.color_hex" type="color" class="h-[46px] w-12 border border-border" :aria-label="`Row ${i + 1} swatch`"></td>
                <td class="p-2">
                  <input v-model="r.sku" class="inp !w-44" :placeholder="r.sku_auto ? 'auto' : ''" maxlength="40" :aria-label="`Row ${i + 1} SKU`" @input="onSkuInput(r)">
                  <div class="mt-1 flex flex-wrap items-center gap-x-2 text-[11.5px] text-muted">
                    <template v-if="!r.id">
                      <span v-if="r.sku_auto">Auto preview, final SKU is set on save</span>
                      <template v-else><span>Custom</span><button type="button" class="font-semibold text-accent underline" @click="skuAuto(r)">Use auto</button></template>
                    </template>
                    <template v-else-if="canSuggest(r)"><button type="button" class="font-semibold text-accent underline" @click="r.sku = suggestion(r)">Use {{ suggestion(r) }}</button></template>
                  </div>
                </td>
                <td class="p-2"><input v-model="r.price_override" type="number" min="0" step="0.01" class="inp !w-28" :aria-label="`Row ${i + 1} price override`"></td>
                <td class="p-2"><input v-if="!r.id" v-model.number="r.on_hand" type="number" min="0" step="1" class="inp !w-24" :aria-label="`Row ${i + 1} opening stock`"><span v-else>{{ r.on_hand }}</span></td>
                <td class="p-2"><button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove row ${i + 1}`" @click="r.id ? (r.is_active = false) : form.variants.splice(i, 1)">×</button></td>
              </tr>
              <tr v-if="r.is_active !== false && rowProblems(r).length" class="border-0"><td colspan="7" class="px-2 pb-2"><p v-for="m in rowProblems(r)" :key="m" class="err" role="alert">Row {{ i + 1 }} · {{ m }}</p></td></tr>
            </template>
            <tr v-if="!activeVariants.length"><td colspan="7" class="p-3 text-muted">{{ isNew ? 'No variants yet: a single default variant is created on save.' : 'No active variants. Add at least one before publishing.' }}</td></tr>
          </tbody>
        </table></div>
        <button type="button" class="btn-secondary self-start" @click="addVariant">+ Add variant</button>
        <p v-if="serverErr('variants') && !hasRowServerErrors" class="err" role="alert">{{ serverErr('variants') }}</p>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Images <span class="text-[11.5px] font-normal tracking-normal text-muted">(Optional to save, at least one is needed to publish)</span></h2>
        <p class="hint">JPG, PNG or WebP, max 5 MB, at least {{ PRODUCT_MIN_SIDE }} px on the long side. Portrait 3:4 recommended. The first is the cover.</p>
        <ul class="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="(im, i) in form.images" :key="im.id" class="relative flex flex-col gap-1.5 border border-border p-2">
            <NuxtImg format="webp" :src="mediaSrc(im.media.url)" :alt="im.media.alt_text" width="128" height="170" class="h-[170px] w-full object-cover" />
            <span v-if="im.is_primary" class="absolute left-3 top-3 bg-ink px-[7px] py-1 text-[10px] uppercase tracking-[0.12em] text-bg">Cover</span><button v-else type="button" class="min-h-9 self-start text-xs font-semibold uppercase tracking-[0.1em] text-accent" @click="setPrimary(im)">Make cover</button>
            <select class="inp !h-9 !px-1 text-xs" :value="im.color" :aria-label="`Colour for photo ${i + 1}`" @change="setColor(im, ($event.target as HTMLSelectElement).value)"><option value="">Any colour</option><option v-for="c in colourNames" :key="c">{{ c }}</option></select>
            <div class="flex justify-between"><button type="button" class="min-h-9 min-w-9" aria-label="Move earlier" @click="moveImage(i, -1)">←</button><button type="button" class="min-h-9 min-w-9" aria-label="Move later" @click="moveImage(i, 1)">→</button><button type="button" class="min-h-9 min-w-9" aria-label="Delete photo" @click="removeImage(im)">×</button></div>
          </li>
          <li v-for="p in pending" :key="p.key" class="relative flex flex-col gap-1.5 border border-dashed p-2" :class="p.state === 'invalid' || p.state === 'failed' ? 'border-accent' : 'border-field'">
            <img :src="p.url" :alt="p.file.name" class="h-[170px] w-full object-cover" :class="p.state === 'invalid' ? 'opacity-50' : ''">
            <p class="break-all text-[11.5px] text-muted">{{ p.file.name }}</p>
            <p v-if="p.state === 'ready'" class="text-[12px] text-muted">Uploads when you save</p>
            <p v-else-if="p.state === 'uploading'" class="text-[12px] text-muted" role="status"><span class="mr-1 inline-block h-3 w-3 animate-spin rounded-full border-2 border-accent border-t-transparent align-[-2px]" />Uploading…</p>
            <p v-else class="err !text-[12px]" role="alert">{{ p.error }}</p>
            <button v-if="p.state !== 'uploading'" type="button" class="min-h-9 self-start text-xs font-semibold uppercase tracking-[0.1em] text-muted hover:text-ink" @click="dropPending(p)">Remove</button>
          </li>
          <li class="col-span-2 sm:col-span-1">
            <label class="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 border border-dashed border-text-dark-3 bg-admin-bg p-5 text-center transition-colors hover:border-ink">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="text-gold" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
              <span class="text-[15px]">Add photos <span class="border-b border-ink">browse</span></span><span class="text-[12.5px] text-muted">JPG, PNG or WebP, portrait 3:4</span>
              <input type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp" @change="onFiles">
            </label>
          </li>
        </ul>
        <p v-if="readyCount" class="hint">{{ readyCount }} photo{{ readyCount === 1 ? '' : 's' }} will upload when you save{{ isNew ? ' (after the product is created)' : '' }}.</p>
        <p v-if="serverErr('is_active')" class="err" role="alert">{{ serverErr('is_active') }}</p>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">SEO</h2>
        <AdminFormField name="seo_title" label="SEO title" :error="v.errorFor('seo_title')" :counter="{ value: form.seo_title, max: 120 }">
          <template #default="s"><input :id="s.id" v-model="form.seo_title" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('seo_title')" @blur="v.touch('seo_title')"></template>
        </AdminFormField>
        <AdminFormField name="seo_description" label="SEO description" :error="v.errorFor('seo_description')" :counter="{ value: form.seo_description, max: 300 }">
          <template #default="s"><textarea :id="s.id" v-model="form.seo_description" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="fieldIn('seo_description')" @blur="v.touch('seo_description')" /></template>
        </AdminFormField>
      </fieldset>
      </div>

      <aside class="flex w-full flex-col gap-6 xl:sticky xl:top-6 xl:w-[320px] xl:flex-none">
        <fieldset class="card !gap-3" :disabled="!canEdit" aria-labelledby="status-h">
          <div class="flex items-center justify-between gap-3">
            <h2 id="status-h" class="text-2xl">Status</h2>
            <span class="stage" :data-stage="published ? 'delivered' : 'draft'">{{ published ? 'Published' : 'Unpublished' }}</span>
          </div>
          <div class="flex items-center justify-between gap-3">
            <span id="status-sw" class="text-[14.5px]">{{ isNew ? 'Publish when saved' : 'Visible on the storefront' }}</span>
            <button
              type="button" role="switch" class="switch" :aria-checked="statusOn" aria-labelledby="status-sw"
              :disabled="busy || (!statusOn && !canPublish)" @click="onStatusSwitch"
            ><span class="sr-only">{{ statusOn ? 'Published' : 'Unpublished' }}</span></button>
          </div>
          <ul class="flex flex-col gap-1 text-[13px]" aria-label="Publishing requirements">
            <li v-for="c in checks" :key="c.text" class="flex items-center gap-2" :class="c.ok ? 'text-body' : 'text-muted'"><span aria-hidden="true" :class="c.ok ? 'text-primary' : 'text-accent'">{{ c.ok ? '✓' : '○' }}</span>{{ c.text }}<span class="sr-only">{{ c.ok ? ' (done)' : ' (missing)' }}</span></li>
          </ul>
          <p class="hint">{{ isNew ? 'New products are saved as a draft first, then published once their photos are uploaded.' : published ? 'Unpublish to hide it from the storefront without deleting it.' : 'Unpublished products are hidden from the storefront.' }}</p>
        </fieldset>
        <fieldset class="card !gap-1.5" :disabled="!canEdit">
          <h2 class="mb-2 text-2xl">Show in sections <span class="text-[11.5px] font-normal tracking-normal text-muted">(Optional)</span></h2>
          <label v-for="fl in ([['is_new', 'New arrival'], ['is_signature', 'Signature'], ['is_offer', 'Special offer']] as const)" :key="fl[0]" class="flex min-h-11 cursor-pointer items-center gap-3 text-[14.5px]"><input v-model="form[fl[0]]" type="checkbox">{{ fl[1] }}</label>
          <p class="hint mt-1">Controls which home-page and listing sections show this product.</p>
        </fieldset>
        <div class="card !gap-3.5" aria-label="Storefront preview">
          <div class="cap">Storefront preview</div>
          <StoreTile :src="form.images?.[0]?.media?.url" :alt="form.name" :tile-key="form.id ?? 1" :category="(cats ?? []).find((c: Dict) => c.id === form.category)?.name" ratio="3/4" :width="300" :height="400" art-width="50%" />
          <div class="text-[11px] uppercase tracking-[0.16em] text-muted">{{ (cats ?? []).find((c: Dict) => c.id === form.category)?.name || 'Category' }}</div>
          <div class="font-display text-2xl leading-[1.15]">{{ form.name || 'Product name' }}</div>
          <div class="text-[15px]">{{ form.price ? taka(form.price) : '৳ 0' }}<s v-if="form.compare_at_price" class="ml-2 text-sm text-muted">{{ taka(form.compare_at_price) }}</s></div>
        </div>
      </aside>
    </form>
  </section>
</template>
