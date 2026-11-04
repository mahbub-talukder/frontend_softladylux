<script setup lang="ts">
// Design: AdminProducts board (form). SRS ADM-03, CAT-02..04, CAT-19: the Sub-category drop-down
// lists only the active sub-categories of the chosen category, is disabled until a category is
// chosen, is required when the category has any, and clears when the category changes.
// Flow: Save draft -> add images -> Publish (a product needs an image to be published, CAT-04).
import type { Dict } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'products.view' })
const route = useRoute()
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf } = useApi()
const isNew = computed(() => route.params.id === 'new')

const { data: cats } = await useAsyncData('admin-cats-form', () => api<Dict[]>('/admin/categories/'))
const blank = (): Dict => ({
  name: '', slug: '', category: null, subcategory: null, short_desc: '', description: '', care_notes: '',
  collection: '', uom: 'pc', price: '', compare_at_price: '', sku_prefix: '', is_active: false, is_new: false,
  is_signature: false, is_offer: false, tags: [], seo_title: '', seo_description: '', variants: [], images: []
})
const form = ref<Dict>(blank())
const tags = ref('')
const pending = ref<File[]>([])
const errors = ref<Record<string, string[]>>({})
const error = ref('')
const message = ref('')
const busy = ref(false)

async function load() {
  if (isNew.value) return
  const p = await api<Dict>(`/admin/products/${route.params.id}/`)
  form.value = p; tags.value = (p.tags || []).join(', ')
}
await load()

const subOptions = computed(() => cats.value?.find((c) => c.id === form.value.category)?.subcategories.filter((s: Dict) => s.is_active) ?? [])
function onCategory() { form.value.subcategory = null } // CAT-19: changing the category clears it

// ---- variants
const genSizes = ref('')
const genColours = ref('')
const addVariant = () => form.value.variants.push({ size_label: '', color_name: '', color_hex: '', sku: '', price_override: null, on_hand: 0, is_active: true })
function generate() {
  const sizes = genSizes.value.split(',').map((s) => s.trim()).filter(Boolean)
  const colours = genColours.value.split(',').map((s) => s.trim()).filter(Boolean)
  for (const c of colours.length ? colours : ['']) for (const s of sizes.length ? sizes : ['']) {
    if (!form.value.variants.some((v: Dict) => v.size_label === s && v.color_name === c)) form.value.variants.push({ size_label: s, color_name: c, color_hex: '', sku: '', price_override: null, on_hand: 0, is_active: true })
  }
}
const colourNames = computed<string[]>(() => [...new Set<string>(form.value.variants.map((v: Dict) => v.color_name).filter(Boolean))])
const activeVariants = computed(() => form.value.variants.filter((v: Dict) => v.is_active !== false))

// ---- save
function payload(publish: boolean) {
  const f = form.value
  return {
    name: f.name, slug: f.slug || undefined, category: f.category, subcategory: f.subcategory, short_desc: f.short_desc,
    description: f.description, care_notes: f.care_notes, collection: f.collection, uom: f.uom, price: f.price,
    compare_at_price: f.compare_at_price || null, sku_prefix: f.sku_prefix, is_new: f.is_new, is_signature: f.is_signature,
    is_offer: f.is_offer, tags: tags.value.split(',').map((t) => t.trim()).filter(Boolean), seo_title: f.seo_title,
    seo_description: f.seo_description, is_active: publish ? true : (isNew.value ? false : f.is_active),
    variants: f.variants.filter((v: Dict) => v.is_active !== false).map((v: Dict) => ({
      id: v.id, size_label: v.size_label, color_name: v.color_name, color_hex: v.color_hex || '', sku: v.sku || '',
      price_override: v.price_override || null, ...(v.id ? {} : { on_hand: Number(v.on_hand) || 0 })
    }))
  }
}
async function uploadPending(id: number) {
  if (!pending.value.length) return
  // Upload in small batches: a proxy body limit (nginx) can then never reject a whole product's photos.
  for (let i = 0; i < pending.value.length; i += 2) {
    const fd = new FormData()
    pending.value.slice(i, i + 2).forEach((f) => fd.append('files', f))
    fd.append('alt_text', form.value.name)
    await api(`/admin/products/${id}/images/`, { method: 'POST', body: fd })
  }
  pending.value = []
}
async function save(publish = false) {
  busy.value = true; error.value = ''; errors.value = {}; message.value = ''
  try {
    // New product: create as a draft first (images need an id), upload, then publish if asked.
    let id = Number(route.params.id)
    if (isNew.value) {
      const created = await api<Dict>('/admin/products/', { method: 'POST', body: { ...payload(false), is_active: false } })
      id = created.id
      await uploadPending(id)
      if (publish) await api(`/admin/products/${id}/`, { method: 'PATCH', body: { is_active: true } })
      await navigateTo(`/admin/products/${id}`)
      return
    }
    await uploadPending(id)
    form.value = await api<Dict>(`/admin/products/${id}/`, { method: 'PATCH', body: payload(publish) })
    message.value = publish ? 'Published.' : 'Saved.'
  } catch (e) {
    const er = errorOf(e); errors.value = er.fields; error.value = er.message
  } finally { busy.value = false }
}
async function unpublish() { form.value = await api<Dict>(`/admin/products/${route.params.id}/`, { method: 'PATCH', body: { is_active: false } }); message.value = 'Moved to draft.' }

// ---- images (existing product)
async function setPrimary(img: Dict) { await api(`/admin/products/${form.value.id}/images/${img.id}/`, { method: 'PATCH', body: { is_primary: true } }); await load() }
async function setColor(img: Dict, color: string) { await api(`/admin/products/${form.value.id}/images/${img.id}/`, { method: 'PATCH', body: { color } }) }
async function removeImage(img: Dict) { if (confirm('Delete this photo?')) { await api(`/admin/products/${form.value.id}/images/${img.id}/`, { method: 'DELETE' }); await load() } }
async function moveImage(i: number, d: number) {
  const ids = form.value.images.map((x: Dict) => x.id)
  const j = i + d
  if (j < 0 || j >= ids.length) return
  ;[ids[i], ids[j]] = [ids[j], ids[i]]
  form.value.images = await api<Dict[]>(`/admin/products/${form.value.id}/images/reorder/`, { method: 'POST', body: { ids } })
}
function onFiles(e: Event) { pending.value.push(...Array.from((e.target as HTMLInputElement).files ?? [])); (e.target as HTMLInputElement).value = '' }
const fieldErr = (k: string) => errors.value[k] ?? []
</script>

<template>
  <section>
    <NuxtLink to="/admin/products" class="inline-flex min-h-11 items-center text-xs font-semibold uppercase tracking-[0.14em] text-muted transition-colors hover:text-ink">← All products</NuxtLink>
    <AdminHeading eyebrow="Catalogue" :title="isNew ? 'Add product' : form.name || 'Edit product'">
      <template v-if="canEdit">
        <button class="btn-secondary" :disabled="busy" data-track="product_save_draft" @click="save(false)">{{ isNew || !form.is_active ? 'Save draft' : 'Save' }}</button>
        <button v-if="!form.is_active || isNew" class="btn" :disabled="busy" data-track="product_publish" @click="save(true)">Publish</button>
        <button v-else class="btn-secondary" :disabled="busy" @click="unpublish">Unpublish</button>
      </template>
    </AdminHeading>
    <p v-if="error" class="err mb-3" role="alert">{{ error }}</p>
    <p v-if="message" class="hint mb-3" role="status">{{ message }}</p>

    <form class="flex flex-col gap-6 xl:flex-row xl:items-start" @submit.prevent="save(false)">
      <div class="flex min-w-0 flex-1 flex-col gap-6">
      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Basic information</h2>
        <div class="grid gap-[18px] sm:grid-cols-2"><div class="fld"><label for="pn">Product name</label><input id="pn" v-model="form.name" class="inp" required><p v-for="m in fieldErr('name')" :key="m" class="err">{{ m }}</p></div>
        <div class="fld"><label for="ps">URL slug (optional)</label><input id="ps" v-model="form.slug" class="inp" placeholder="Generated from the name"><p v-for="m in fieldErr('slug')" :key="m" class="err">{{ m }}</p></div></div>
        <div class="fld"><label for="psd">Short description</label><input id="psd" v-model="form.short_desc" class="inp"></div>
        <div class="fld"><label for="pd">Description</label><textarea id="pd" v-model="form.description" class="inp" placeholder="Describe the fit, fabric and feel…" /></div>
        <div class="fld"><label for="pcare">Fabric &amp; care</label><textarea id="pcare" v-model="form.care_notes" class="inp" /></div>
        <div class="grid gap-[18px] sm:grid-cols-2"><div class="fld"><label for="pcol">Collection / brand</label><input id="pcol" v-model="form.collection" class="inp"></div>
        <div class="fld"><label for="ptags">Tags (comma separated)</label><input id="ptags" v-model="tags" class="inp"></div></div>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Category, unit &amp; SKU</h2>
        <div class="grid gap-[18px] sm:grid-cols-2 lg:grid-cols-3">
        <div class="fld"><label for="pc">Category</label>
          <select id="pc" v-model="form.category" class="inp" required @change="onCategory"><option :value="null" disabled>Choose a category</option><option v-for="c in cats" :key="c.id" :value="c.id">{{ c.name }}</option></select></div>
        <div class="fld"><label for="psc">Sub-category</label>
          <select id="psc" v-model="form.subcategory" class="inp" :disabled="!form.category || !subOptions.length" :required="subOptions.length > 0">
            <option :value="null">{{ !form.category ? 'Choose a category first' : subOptions.length ? 'Choose a sub-category' : 'No sub-categories' }}</option>
            <option v-for="s in subOptions" :key="s.id" :value="s.id">{{ s.name }}</option></select>
          <p v-for="m in fieldErr('subcategory')" :key="m" class="err">{{ m }}</p></div>
        <div class="fld"><label for="pu">Unit of measure</label>
          <select id="pu" v-model="form.uom" class="inp"><option value="pc">Piece (pcs)</option><option value="set">Set</option><option value="pack">Pack</option><option value="pair">Pair</option></select></div>
        </div>
        <div class="fld max-w-sm"><label for="pfx">SKU prefix</label><input id="pfx" v-model="form.sku_prefix" class="inp" placeholder="Generated from the name"><p class="hint">Variant SKUs add colour and size. Capital letters, digits and dashes only.</p></div>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Pricing</h2>
        <div class="grid gap-[18px] sm:grid-cols-2"><div class="fld"><label for="pp">Price (৳)</label><input id="pp" v-model="form.price" type="number" min="0" step="0.01" class="inp" required><p v-for="m in fieldErr('price')" :key="m" class="err">{{ m }}</p></div>
        <div class="fld"><label for="pcmp">Compare-at price (৳)</label><input id="pcmp" v-model="form.compare_at_price" type="number" min="0" step="0.01" class="inp" placeholder="Optional, must be higher than the price"><p v-for="m in fieldErr('compare_at_price')" :key="m" class="err">{{ m }}</p></div>
        </div>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Variants</h2>
        <p class="hint">Sizes × colours. Each row has its own SKU and stock. Opening stock is logged as a stock movement; later changes go through Inventory.</p>
        <div class="flex flex-wrap items-end gap-2">
          <div class="fld"><label for="gs">Sizes</label><input id="gs" v-model="genSizes" class="inp !w-48" placeholder="S, M, L or 34B, 36C"></div>
          <div class="fld"><label for="gc">Colours</label><input id="gc" v-model="genColours" class="inp !w-48" placeholder="Rose, Black"></div>
          <button type="button" class="btn-secondary" @click="generate">Generate rows</button>
        </div>
        <div class="overflow-x-auto"><table class="w-full text-left text-sm">
          <thead><tr class="cap"><th class="p-2">Size</th><th class="p-2">Colour</th><th class="p-2">Swatch</th><th class="p-2">SKU</th><th class="p-2">Price override</th><th class="p-2">Stock</th><th /></tr></thead>
          <tbody>
            <tr v-for="(v, i) in form.variants" v-show="v.is_active !== false" :key="v.id ?? `n${i}`" class="border-t border-border">
              <td class="p-2"><input v-model="v.size_label" class="inp !w-20" :aria-label="`Row ${i + 1} size`"></td>
              <td class="p-2"><input v-model="v.color_name" class="inp !w-28" :aria-label="`Row ${i + 1} colour`"></td>
              <td class="p-2"><input v-model="v.color_hex" type="color" class="h-[46px] w-12 border border-border" :aria-label="`Row ${i + 1} swatch`"></td>
              <td class="p-2"><input v-model="v.sku" class="inp !w-40" placeholder="auto" :aria-label="`Row ${i + 1} SKU`"></td>
              <td class="p-2"><input v-model="v.price_override" type="number" min="0" class="inp !w-28" :aria-label="`Row ${i + 1} price override`"></td>
              <td class="p-2"><input v-if="!v.id" v-model.number="v.on_hand" type="number" min="0" class="inp !w-24" :aria-label="`Row ${i + 1} opening stock`"><span v-else>{{ v.on_hand }}</span></td>
              <td class="p-2"><button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove row ${i + 1}`" @click="v.id ? (v.is_active = false) : form.variants.splice(i, 1)">×</button></td>
            </tr>
            <tr v-if="!activeVariants.length"><td colspan="7" class="p-3 text-muted">No variants yet: a single default variant is created on save.</td></tr>
          </tbody>
        </table></div>
        <button type="button" class="btn-secondary self-start" @click="addVariant">+ Add variant</button>
        <p v-for="m in fieldErr('variants')" :key="m" class="err">{{ m }}</p>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">Images</h2>
        <p class="hint">JPG, PNG or WebP, max 5 MB, at least 600 px on the long side. Portrait 3:4 recommended. The first is the cover.</p>
        <ul class="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4">
          <li v-for="(im, i) in form.images" :key="im.id" class="relative flex flex-col gap-1.5 border border-border p-2">
            <NuxtImg format="webp" :src="mediaSrc(im.media.url)" :alt="im.media.alt_text" width="128" height="170" class="h-[170px] w-full object-cover" />
            <span v-if="im.is_primary" class="absolute left-3 top-3 bg-ink px-[7px] py-1 text-[10px] uppercase tracking-[0.12em] text-bg">Cover</span><button v-else type="button" class="min-h-9 self-start text-xs font-semibold uppercase tracking-[0.1em] text-accent" @click="setPrimary(im)">Make cover</button>
            <select class="inp !h-9 !px-1 text-xs" :value="im.color" :aria-label="`Colour for photo ${i + 1}`" @change="setColor(im, ($event.target as HTMLSelectElement).value)"><option value="">Any colour</option><option v-for="c in colourNames" :key="c">{{ c }}</option></select>
            <div class="flex justify-between"><button type="button" aria-label="Move earlier" @click="moveImage(i, -1)">←</button><button type="button" aria-label="Move later" @click="moveImage(i, 1)">→</button><button type="button" aria-label="Delete photo" @click="removeImage(im)">×</button></div>
          </li>
          <li v-for="f in pending" :key="f.name + f.size" class="flex min-h-[200px] items-center justify-center border border-dashed border-field p-2 text-center text-xs text-muted">{{ f.name }}<br>(uploads on save)</li>
          <li class="col-span-2 sm:col-span-1">
            <label class="flex min-h-[200px] cursor-pointer flex-col items-center justify-center gap-2.5 border border-dashed border-text-dark-3 bg-admin-bg p-5 text-center transition-colors hover:border-ink">
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" class="text-gold" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5M4 20h16" /></svg>
              <span class="text-[15px]">Add photos <span class="border-b border-ink">browse</span></span><span class="text-[12.5px] text-muted">JPG or PNG, portrait 3:4</span>
              <input type="file" class="sr-only" multiple accept="image/jpeg,image/png,image/webp" @change="onFiles">
            </label>
          </li>
        </ul>
        <p v-for="m in fieldErr('is_active')" :key="m" class="err">{{ m }}</p>
      </fieldset>

      <fieldset class="card" :disabled="!canEdit">
        <h2 class="text-2xl">SEO</h2>
        <div class="fld"><label for="seot">SEO title</label><input id="seot" v-model="form.seo_title" class="inp"></div>
        <div class="fld"><label for="seod">SEO description</label><textarea id="seod" v-model="form.seo_description" class="inp" /></div>
      </fieldset>
      </div>

      <aside class="flex w-full flex-col gap-6 xl:sticky xl:top-6 xl:w-[320px] xl:flex-none">
        <fieldset class="card !gap-1.5" :disabled="!canEdit">
          <h2 class="mb-2 text-2xl">Show in sections</h2>
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
