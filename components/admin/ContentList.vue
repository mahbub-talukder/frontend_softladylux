<script setup lang="ts">
// Generic editor for the Website tabs (SRS ADM-04, WEB-01..08): list, add, edit, delete with the
// on/off switch (WEB-10: changes go live on save). Fields describe the form; media fields use
// the upload control (WEB-09).
import type { Dict, Media } from '~/types/api'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'media' | 'select'
  options?: string[]
  hint?: string
  kind?: string
}
const props = defineProps<{
  endpoint: string
  fields: FieldDef[]
  titleKey: string
  canCreate?: boolean
  canDelete?: boolean
  defaults?: Record<string, unknown>
  note?: string
}>()
const { api, errorOf } = useApi()
type Row = Dict
const items = ref<Row[]>([])
const draft = ref<Row | null>(null)
const errors = ref<Record<string, string>>({})

async function load() { items.value = await api<Row[]>(props.endpoint) }
await load()

const payload = (row: Row) => {
  const body: Row = {}
  for (const f of props.fields) body[f.key] = f.type === 'media' ? (row[f.key]?.id ?? null) : row[f.key]
  body.is_active = row.is_active ?? true; body.sort = Number(row.sort ?? 0)
  return body
}
function fail(key: number | string, e: unknown) {
  const er = errorOf(e); errors.value[key] = Object.values(er.fields).flat().join(' ') || er.message
}
async function save(row: Row) {
  try { await api(`${props.endpoint}${row.id}/`, { method: 'PATCH', body: payload(row) }); errors.value[row.id] = ''; await load() }
  catch (e) { fail(row.id, e) }
}
async function create() {
  if (!draft.value) return
  try { await api(props.endpoint, { method: 'POST', body: payload(draft.value) }); draft.value = null; errors.value.new = ''; await load() }
  catch (e) { fail('new', e) }
}
async function remove(row: Row) {
  if (!confirm(`Delete "${row[props.titleKey] || 'this item'}"?`)) return // ADM-08
  await api(`${props.endpoint}${row.id}/`, { method: 'DELETE' }); await load()
}
const startDraft = () => { draft.value = { is_active: true, sort: items.value.length, ...props.defaults } }
const setMedia = (row: Row, key: string, m: Media | null) => { row[key] = m }
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-4">
    <p v-if="note" class="hint">{{ note }}</p>
    <div v-for="row in items" :key="row.id" class="card md:grid md:grid-cols-2 md:gap-x-6 [&>*:not(.fld)]:col-span-2 [&>.fld:has(textarea)]:col-span-2 [&>.fld:has(input[type=file])]:col-span-2">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xl">{{ row[titleKey] || row.placement || `Item ${row.id}` }}</h3>
        <label class="flex items-center gap-2 text-sm">On
          <button type="button" role="switch" class="switch" :aria-checked="!!row.is_active" :aria-label="`Show ${row[titleKey] || 'item'}`" @click="row.is_active = !row.is_active" />
        </label>
      </div>
      <template v-for="f in fields" :key="f.key">
        <AdminMediaField v-if="f.type === 'media'" :model-value="row[f.key]" :kind="f.kind || 'page'" :label="f.label" :hint="f.hint || ''" @update:model-value="setMedia(row, f.key, $event)" />
        <div v-else class="fld">
          <label :for="`${endpoint}${row.id}${f.key}`">{{ f.label }}</label>
          <textarea v-if="f.type === 'textarea'" :id="`${endpoint}${row.id}${f.key}`" v-model="row[f.key]" class="inp" />
          <select v-else-if="f.type === 'select'" :id="`${endpoint}${row.id}${f.key}`" v-model="row[f.key]" class="inp"><option v-for="o in f.options" :key="o">{{ o }}</option></select>
          <input v-else :id="`${endpoint}${row.id}${f.key}`" v-model="row[f.key]" class="inp" :type="f.type === 'number' ? 'number' : 'text'">
        </div>
      </template>
      <div class="fld"><label :for="`${endpoint}${row.id}sort`">Order</label><input :id="`${endpoint}${row.id}sort`" v-model="row.sort" type="number" class="inp w-28"></div>
      <p v-if="errors[row.id]" class="err" role="alert">{{ errors[row.id] }}</p>
      <div class="flex gap-3">
        <button class="btn" @click="save(row)">Save</button>
        <button v-if="canDelete" class="btn-secondary" @click="remove(row)">Delete</button>
      </div>
    </div>
    <p v-if="!items.length" class="hint">Nothing here yet.</p>
    <template v-if="canCreate">
      <button v-if="!draft" class="btn-secondary self-start" @click="startDraft">+ Add</button>
      <div v-else class="card md:grid md:grid-cols-2 md:gap-x-6 [&>*:not(.fld)]:col-span-2 [&>.fld:has(textarea)]:col-span-2 [&>.fld:has(input[type=file])]:col-span-2">
        <h3 class="text-xl">New item</h3>
        <template v-for="f in fields" :key="f.key">
          <AdminMediaField v-if="f.type === 'media'" :model-value="draft[f.key] ?? null" :kind="f.kind || 'page'" :label="f.label" :hint="f.hint || ''" @update:model-value="setMedia(draft, f.key, $event)" />
          <div v-else class="fld">
            <label :for="`new${f.key}`">{{ f.label }}</label>
            <textarea v-if="f.type === 'textarea'" :id="`new${f.key}`" v-model="draft[f.key]" class="inp" />
            <select v-else-if="f.type === 'select'" :id="`new${f.key}`" v-model="draft[f.key]" class="inp"><option v-for="o in f.options" :key="o">{{ o }}</option></select>
            <input v-else :id="`new${f.key}`" v-model="draft[f.key]" class="inp" :type="f.type === 'number' ? 'number' : 'text'">
          </div>
        </template>
        <p v-if="errors.new" class="err" role="alert">{{ errors.new }}</p>
        <div class="flex gap-3"><button class="btn" @click="create">Add</button><button class="btn-secondary" @click="draft = null">Cancel</button></div>
      </div>
    </template>
  </div>
</template>
