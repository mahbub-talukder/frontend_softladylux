<script setup lang="ts">
// SRS CAT-01, CAT-17, CAT-18, CAT-21, WEB-03: category form with a repeatable Sub-categories
// section (add, remove, reorder, on/off) saved in one request. products.view reads, products.manage writes.
// UI-06 / §10: inline validation (name <= 60, sub-category 2-40 characters and unique per category, case-insensitive).
import type { Dict, Media } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'products.view' })
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf, toast } = useApi()
const cats = ref<Dict[]>([])
const current = ref<Dict | null>(null)
const tile = ref<Media | null>(null)
const error = ref('')
const busy = ref(false)

const { required, maxLength } = rules
const v = useFormValidation(() => current.value ?? {}, {
  name: [required('Enter a category name.'), maxLength(60)],
  seo_title: [maxLength(120)],
  seo_description: [maxLength(300)]
})

async function load(selectId?: number) {
  cats.value = await api<Dict[]>('/admin/categories/')
  const pick = cats.value.find((c) => c.id === (selectId ?? current.value?.id)) ?? cats.value[0]
  select(pick)
}
function select(c: Dict | undefined) {
  current.value = c ? JSON.parse(JSON.stringify(c)) : null
  tile.value = c?.tile_media ?? null
  error.value = ''; v.reset()
}
await load()

function startNew() {
  current.value = { name: '', description: '', is_active: true, seo_title: '', seo_description: '', subcategories: [] }
  tile.value = null; error.value = ''; v.reset()
}
const addRow = () => current.value!.subcategories.push({ name: '', sort: current.value!.subcategories.length, is_active: true })
const removeRow = (i: number) => current.value!.subcategories.splice(i, 1)
function move(i: number, d: number) {
  const rows = current.value!.subcategories
  const j = i + d
  if (j < 0 || j >= rows.length) return
  ;[rows[i], rows[j]] = [rows[j], rows[i]]
}

// Sub-category rules (§10): 2-40 characters, unique within the category, case-insensitive.
function subError(i: number): string {
  const rows = current.value?.subcategories ?? []
  const name = String(rows[i]?.name ?? '').trim()
  if (!name) return 'Enter a name, or remove this row.'
  if (name.length < 2 || name.length > 40) return 'Use 2-40 characters.'
  if (rows.some((r: Dict, j: number) => j < i && String(r.name ?? '').trim().toLowerCase() === name.toLowerCase())) return `"${name}" is listed twice.`
  return v.server[`subcategories[${i}].name`]?.join(' ') ?? ''
}
const subErrors = computed(() => (current.value?.subcategories ?? []).map((_: Dict, i: number) => subError(i)))
const showSubErrors = ref(false)

async function save() {
  const c = current.value!
  error.value = ''; showSubErrors.value = true
  const okFields = v.validateAll()
  if (!okFields || subErrors.value.some(Boolean)) {
    toast.error('Please fix the highlighted fields', [...v.summary.value, ...subErrors.value.filter(Boolean)].slice(0, 3))
    return
  }
  const body = {
    name: c.name.trim(), description: c.description, is_active: c.is_active, seo_title: c.seo_title,
    seo_description: c.seo_description, tile_media: tile.value?.id ?? null,
    subcategories: c.subcategories.map((s: Dict, i: number) => ({ id: s.id, name: String(s.name).trim(), slug: s.slug, sort: i, is_active: s.is_active }))
  }
  busy.value = true
  try {
    const saved = c.id
      ? await api<Dict>(`/admin/categories/${c.id}/`, { method: 'PATCH', body, successMessage: 'Category saved' })
      : await api<Dict>('/admin/categories/', { method: 'POST', body, successMessage: 'Category created' })
    showSubErrors.value = false
    await load(saved.id)
  } catch (e) {
    const er = errorOf(e)
    v.setServerErrors(er); error.value = er.flat.join(' ')
  } finally { busy.value = false }
}
async function remove() {
  const c = current.value!
  if (!confirm(`Delete “${c.name}”?`)) return // ADM-08
  try { await api(`/admin/categories/${c.id}/`, { method: 'DELETE', successMessage: 'Category deleted' }); await load() } catch (e) { error.value = errorOf(e).message }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Catalogue" title="Categories">
      <button v-if="canEdit" class="btn-secondary" @click="startNew">+ Add category</button>
    </AdminHeading>
    <p class="hint mb-3"><span class="text-accent" aria-hidden="true">*</span> marks mandatory fields. Everything else is optional.</p>
    <div class="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div class="card">
        <button v-for="c in cats" :key="c.id" class="flex items-center justify-between border p-3 text-left" :class="c.id === current?.id ? 'border-primary' : 'border-border'" @click="select(c)">
          <span>{{ c.name }}</span><span class="hint">{{ c.is_active ? c.product_count : 'hidden' }}</span>
        </button>
      </div>
      <form v-if="current" class="card" novalidate @submit.prevent="save">
        <h2 class="text-2xl">{{ current.id ? current.name : 'New category' }}</h2>
        <AdminFormField name="name" label="Name" required :error="v.errorFor('name')" :counter="{ value: current.name, max: 60 }">
          <template #default="s"><input :id="s.id" v-model="current.name" class="inp" :disabled="!canEdit" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('name')" @blur="v.touch('name')"></template>
        </AdminFormField>
        <AdminFormField name="description" label="Description">
          <template #default="s"><textarea :id="s.id" v-model="current.description" class="inp" :disabled="!canEdit" /></template>
        </AdminFormField>
        <AdminMediaField v-if="canEdit" v-model="tile" kind="category" label="Tile image (home category carousel)" hint="800 × 1000 px" />
        <label class="flex items-center gap-3 text-sm">Visible on the storefront
          <button type="button" role="switch" class="switch" :aria-checked="!!current.is_active" :disabled="!canEdit" @click="current.is_active = !current.is_active" /></label>

        <h3 class="text-xl">Sub-categories <span class="text-[11.5px] font-normal tracking-normal text-muted">(Optional)</span></h3>
        <p class="hint">Example: Bras → Maternity Bra, Air Bra, Tube Bra. A category may have none, one or many. Products in a category with active sub-categories must pick one.</p>
        <div v-for="(s, i) in current.subcategories" :key="s.id ?? `n${i}`" class="flex flex-col gap-1">
          <div class="flex flex-wrap items-center gap-2">
            <input v-model="s.name" class="inp !w-64" maxlength="40" placeholder="Sub-category name" :aria-label="`Sub-category ${i + 1} name`" :aria-invalid="showSubErrors && !!subErrors[i]" :disabled="!canEdit">
            <span class="hint">{{ s.id ? `${s.product_count} products` : 'new' }}</span>
            <template v-if="canEdit">
              <button type="button" class="min-h-touch min-w-touch border border-border" aria-label="Move up" @click="move(i, -1)">↑</button>
              <button type="button" class="min-h-touch min-w-touch border border-border" aria-label="Move down" @click="move(i, 1)">↓</button>
              <button type="button" role="switch" class="switch" :aria-checked="!!s.is_active" :aria-label="`Show ${s.name || 'sub-category'}`" @click="s.is_active = !s.is_active" />
              <button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove ${s.name || 'row'}`" @click="removeRow(i)">×</button>
            </template>
          </div>
          <p v-if="showSubErrors && subErrors[i]" class="err" role="alert">{{ subErrors[i] }}</p>
        </div>
        <button v-if="canEdit" type="button" class="btn-secondary self-start" @click="addRow">+ Add sub-category</button>

        <h3 class="text-xl">SEO <span class="text-[11.5px] font-normal tracking-normal text-muted">(Optional)</span></h3>
        <AdminFormField name="seo_title" label="SEO title" :error="v.errorFor('seo_title')" :counter="{ value: current.seo_title, max: 120 }">
          <template #default="s"><input :id="s.id" v-model="current.seo_title" class="inp" :disabled="!canEdit" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('seo_title')" @blur="v.touch('seo_title')"></template>
        </AdminFormField>
        <AdminFormField name="seo_description" label="SEO description" :error="v.errorFor('seo_description')" :counter="{ value: current.seo_description, max: 300 }">
          <template #default="s"><textarea :id="s.id" v-model="current.seo_description" class="inp" :disabled="!canEdit" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="v.onInput('seo_description')" @blur="v.touch('seo_description')" /></template>
        </AdminFormField>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <div v-if="canEdit" class="flex gap-3">
          <button class="btn btn-spin" :disabled="busy" :aria-busy="busy" data-track="category_save">Save category</button>
          <button v-if="current.id" type="button" class="btn-secondary" @click="remove">Delete</button>
        </div>
      </form>
    </div>
  </section>
</template>
