<script setup lang="ts">
// SRS CAT-01, CAT-17, CAT-18, CAT-21, WEB-03: category form with a repeatable Sub-categories
// section (add, remove, reorder, on/off) saved in one request. products.view reads, products.manage writes.
import type { Dict, Media } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'products.view' })
const auth = useAuthStore()
const canEdit = computed(() => auth.can('products.manage'))
const { api, errorOf } = useApi()
const cats = ref<Dict[]>([])
const current = ref<Dict | null>(null)
const tile = ref<Media | null>(null)
const error = ref('')
const message = ref('')

async function load(selectId?: number) {
  cats.value = await api<Dict[]>('/admin/categories/')
  const pick = cats.value.find((c) => c.id === (selectId ?? current.value?.id)) ?? cats.value[0]
  select(pick)
}
function select(c: Dict | undefined) {
  current.value = c ? JSON.parse(JSON.stringify(c)) : null
  tile.value = c?.tile_media ?? null
  error.value = ''; message.value = ''
}
await load()

function startNew() {
  current.value = { name: '', description: '', is_active: true, seo_title: '', seo_description: '', subcategories: [] }
  tile.value = null; error.value = ''; message.value = ''
}
const addRow = () => current.value!.subcategories.push({ name: '', sort: current.value!.subcategories.length, is_active: true })
const removeRow = (i: number) => current.value!.subcategories.splice(i, 1)
function move(i: number, d: number) {
  const rows = current.value!.subcategories
  const j = i + d
  if (j < 0 || j >= rows.length) return
  ;[rows[i], rows[j]] = [rows[j], rows[i]]
}

async function save() {
  const c = current.value!
  error.value = ''; message.value = ''
  const body = {
    name: c.name, description: c.description, is_active: c.is_active, seo_title: c.seo_title,
    seo_description: c.seo_description, tile_media: tile.value?.id ?? null,
    subcategories: c.subcategories.map((s: Dict, i: number) => ({ id: s.id, name: s.name, slug: s.slug, sort: i, is_active: s.is_active }))
  }
  try {
    const saved = c.id
      ? await api<Dict>(`/admin/categories/${c.id}/`, { method: 'PATCH', body })
      : await api<Dict>('/admin/categories/', { method: 'POST', body })
    message.value = 'Saved.'; await load(saved.id)
  } catch (e) {
    const er = errorOf(e)
    error.value = Object.values(er.fields).flat().join(' ') || er.message
  }
}
async function remove() {
  const c = current.value!
  if (!confirm(`Delete “${c.name}”?`)) return // ADM-08
  try { await api(`/admin/categories/${c.id}/`, { method: 'DELETE' }); await load() } catch (e) { error.value = errorOf(e).message }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Catalogue" title="Categories">
      <button v-if="canEdit" class="btn-secondary" @click="startNew">+ Add category</button>
    </AdminHeading>
    <div class="grid gap-6 lg:grid-cols-[260px_1fr]">
      <div class="card">
        <button v-for="c in cats" :key="c.id" class="flex items-center justify-between border p-3 text-left" :class="c.id === current?.id ? 'border-primary' : 'border-border'" @click="select(c)">
          <span>{{ c.name }}</span><span class="hint">{{ c.is_active ? c.product_count : 'hidden' }}</span>
        </button>
      </div>
      <form v-if="current" class="card" @submit.prevent="save">
        <h2 class="text-2xl">{{ current.id ? current.name : 'New category' }}</h2>
        <div class="fld"><label for="cname">Name</label><input id="cname" v-model="current.name" class="inp" required :disabled="!canEdit"></div>
        <div class="fld"><label for="cdesc">Description</label><textarea id="cdesc" v-model="current.description" class="inp" :disabled="!canEdit" /></div>
        <AdminMediaField v-if="canEdit" v-model="tile" kind="category" label="Tile image (home category carousel)" hint="800 × 1000 px" />
        <label class="flex items-center gap-3 text-sm">Visible on the storefront
          <button type="button" role="switch" class="switch" :aria-checked="!!current.is_active" :disabled="!canEdit" @click="current.is_active = !current.is_active" /></label>

        <h3 class="text-xl">Sub-categories</h3>
        <p class="hint">Example: Bras → Maternity Bra, Air Bra, Tube Bra. A category may have none, one or many. Products in a category with active sub-categories must pick one.</p>
        <div v-for="(s, i) in current.subcategories" :key="s.id ?? `n${i}`" class="flex flex-wrap items-center gap-2">
          <input v-model="s.name" class="inp !w-64" placeholder="Sub-category name" :aria-label="`Sub-category ${i + 1} name`" :disabled="!canEdit">
          <span class="hint">{{ s.id ? `${s.product_count} products` : 'new' }}</span>
          <template v-if="canEdit">
            <button type="button" class="min-h-touch min-w-touch border border-border" aria-label="Move up" @click="move(i, -1)">↑</button>
            <button type="button" class="min-h-touch min-w-touch border border-border" aria-label="Move down" @click="move(i, 1)">↓</button>
            <button type="button" role="switch" class="switch" :aria-checked="!!s.is_active" :aria-label="`Show ${s.name || 'sub-category'}`" @click="s.is_active = !s.is_active" />
            <button type="button" class="min-h-touch min-w-touch border border-border" :aria-label="`Remove ${s.name || 'row'}`" @click="removeRow(i)">×</button>
          </template>
        </div>
        <button v-if="canEdit" type="button" class="btn-secondary self-start" @click="addRow">+ Add sub-category</button>

        <h3 class="text-xl">SEO</h3>
        <div class="fld"><label for="st">SEO title</label><input id="st" v-model="current.seo_title" class="inp" :disabled="!canEdit"></div>
        <div class="fld"><label for="sd">SEO description</label><textarea id="sd" v-model="current.seo_description" class="inp" :disabled="!canEdit" /></div>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
        <p v-if="message" class="hint" role="status">{{ message }}</p>
        <div v-if="canEdit" class="flex gap-3">
          <button class="btn" data-track="category_save">Save category</button>
          <button v-if="current.id" type="button" class="btn-secondary" @click="remove">Delete</button>
        </div>
      </form>
    </div>
  </section>
</template>
