<script setup lang="ts">
// Generic editor for the Website tabs (SRS ADM-04, WEB-01..08): list, add, edit, delete with the
// on/off switch (WEB-10: changes go live on save). Fields describe the form; media fields use
// the upload control (WEB-09).
// UI-06: fields declare `required` / `max` / `url`; mandatory ones show "*", the rest "(Optional)", and problems are
// shown inline per item after the first save attempt or when the field is left.
import type { Dict, Media } from '~/types/api'

export interface FieldDef {
  key: string
  label: string
  type?: 'text' | 'textarea' | 'number' | 'media' | 'select'
  options?: string[]
  hint?: string
  kind?: string
  required?: boolean
  /** Maximum characters (mirrors the API's max_length). */
  max?: number
  /** Must be a full http(s) link. */
  url?: boolean
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
const { api, errorOf, toast } = useApi()
type Row = Dict
const items = ref<Row[]>([])
const draft = ref<Row | null>(null)
const errors = ref<Record<string, string>>({})
const tried = ref<Record<string, boolean>>({}) // item key -> a save was attempted, so show every problem
const left = ref<Record<string, boolean>>({}) // `${item}:${field}` -> the field was left

async function load() { items.value = await api<Row[]>(props.endpoint) }
await load()

const R = rules
const OPEN_SORT = 32767
/** Client-side mirror of the API rules for one field of one row. */
function fieldError(f: FieldDef, row: Row): string {
  const v = row[f.key]
  if (f.type === 'media') return f.required && !v ? `Choose ${f.label.toLowerCase()}.` : ''
  const rs = []
  if (f.required) rs.push(R.required(`Enter ${f.label.toLowerCase()}.`))
  if (f.url) rs.push(R.url('Enter a full link starting with http:// or https://.'))
  if (f.max) rs.push(R.maxLength(f.max))
  if (f.type === 'number') rs.push(R.integer(), R.min(0))
  return firstError(rs, v, row) ?? ''
}
const sortError = (row: Row) => firstError([R.integer(), R.min(0), R.max(OPEN_SORT, `Use ${OPEN_SORT} or less.`)], row.sort, row) ?? ''
const keyOf = (row: Row | null) => (row?.id ?? 'new') as string | number
const shown = (row: Row, f: string) => !!(tried.value[keyOf(row)] || left.value[`${keyOf(row)}:${f}`])
const errOf = (f: FieldDef, row: Row) => (shown(row, f.key) ? fieldError(f, row) : '')
const rowInvalid = (row: Row) => props.fields.some((f) => fieldError(f, row)) || !!sortError(row)
const markLeft = (row: Row, f: string) => { left.value[`${keyOf(row)}:${f}`] = true }

const payload = (row: Row) => {
  const body: Row = {}
  for (const f of props.fields) body[f.key] = f.type === 'media' ? (row[f.key]?.id ?? null) : row[f.key]
  body.is_active = row.is_active ?? true; body.sort = Number(row.sort ?? 0)
  return body
}
function fail(key: number | string, e: unknown) {
  const er = errorOf(e); errors.value[key] = er.flat.join(' ')
}
function blocked(row: Row): boolean {
  tried.value[keyOf(row)] = true
  if (!rowInvalid(row)) return false
  const lines = props.fields.map((f) => fieldError(f, row)).filter(Boolean)
  toast.error('Please fix the highlighted fields', lines.slice(0, 3))
  return true
}
async function save(row: Row) {
  if (blocked(row)) return
  try { await api(`${props.endpoint}${row.id}/`, { method: 'PATCH', body: payload(row), successMessage: 'Saved. It is live on the website.', toast: false }); errors.value[row.id] = ''; tried.value[row.id] = false; await load() }
  catch (e) { fail(row.id, e); toast.error('Not saved', errorOf(e).flat.slice(0, 3)) }
}
async function create() {
  if (!draft.value || blocked(draft.value)) return
  try { await api(props.endpoint, { method: 'POST', body: payload(draft.value), successMessage: 'Added. It is live on the website.', toast: false }); draft.value = null; errors.value.new = ''; tried.value.new = false; await load() }
  catch (e) { fail('new', e); toast.error('Not added', errorOf(e).flat.slice(0, 3)) }
}
async function remove(row: Row) {
  if (!confirm(`Delete "${row[props.titleKey] || 'this item'}"?`)) return // ADM-08
  try { await api(`${props.endpoint}${row.id}/`, { method: 'DELETE', successMessage: 'Deleted' }); await load() } catch { /* toast shown by api() */ }
}
const startDraft = () => { draft.value = { is_active: true, sort: items.value.length, ...props.defaults }; tried.value.new = false }
const setMedia = (row: Row, key: string, m: Media | null) => { row[key] = m }
const fid = (row: Row, f: string) => `${props.endpoint}${keyOf(row)}${f}`
</script>

<template>
  <div class="flex max-w-4xl flex-col gap-4">
    <p v-if="note" class="hint">{{ note }}</p>
    <p class="hint"><span class="text-accent" aria-hidden="true">*</span> marks mandatory fields. Everything else is optional.</p>
    <form v-for="row in items" :key="row.id" class="card md:grid md:grid-cols-2 md:gap-x-6 [&>*:not(.fld)]:col-span-2 [&>.fld:has(textarea)]:col-span-2 [&>.fld:has(input[type=file])]:col-span-2" novalidate @submit.prevent="save(row)">
      <div class="flex items-center justify-between gap-3">
        <h3 class="text-xl">{{ row[titleKey] || row.placement || `Item ${row.id}` }}</h3>
        <label class="flex items-center gap-2 text-sm">On
          <button type="button" role="switch" class="switch" :aria-checked="!!row.is_active" :aria-label="`Show ${row[titleKey] || 'item'}`" @click="row.is_active = !row.is_active" />
        </label>
      </div>
      <template v-for="f in fields" :key="f.key">
        <AdminMediaField v-if="f.type === 'media'" :model-value="row[f.key]" :kind="f.kind || 'page'" :label="f.label" :hint="f.hint || ''" :required="f.required" @update:model-value="setMedia(row, f.key, $event)" />
        <p v-if="f.type === 'media' && errOf(f, row)" class="err" role="alert">{{ errOf(f, row) }}</p>
        <AdminFormField v-else-if="f.type !== 'media'" :name="fid(row, f.key)" :label="f.label.replace(/ \(optional\)$/i, '')" :required="f.required" :hint="f.hint" :error="errOf(f, row)" :counter="f.max && f.max >= 100 ? { value: String(row[f.key] ?? ''), max: f.max } : undefined">
          <template #default="s">
            <textarea v-if="f.type === 'textarea'" :id="s.id" v-model="row[f.key]" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @blur="markLeft(row, f.key)" />
            <select v-else-if="f.type === 'select'" :id="s.id" v-model="row[f.key]" class="inp"><option v-for="o in f.options" :key="o">{{ o }}</option></select>
            <input v-else :id="s.id" v-model="row[f.key]" class="inp" :type="f.type === 'number' ? 'number' : 'text'" :maxlength="f.max" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @blur="markLeft(row, f.key)">
          </template>
        </AdminFormField>
      </template>
      <AdminFormField :name="fid(row, 'sort')" label="Order" hint="Lower numbers show first." :error="tried[keyOf(row)] ? sortError(row) : ''">
        <template #default="s"><input :id="s.id" v-model="row.sort" type="number" min="0" step="1" class="inp w-28" :aria-invalid="s.invalid" :aria-describedby="s.describedby"></template>
      </AdminFormField>
      <p v-if="errors[row.id]" class="err" role="alert">{{ errors[row.id] }}</p>
      <div class="flex gap-3">
        <button class="btn">Save</button>
        <button v-if="canDelete" type="button" class="btn-secondary" @click="remove(row)">Delete</button>
      </div>
    </form>
    <p v-if="!items.length" class="hint">Nothing here yet.</p>
    <template v-if="canCreate">
      <button v-if="!draft" class="btn-secondary self-start" @click="startDraft">+ Add</button>
      <form v-else class="card md:grid md:grid-cols-2 md:gap-x-6 [&>*:not(.fld)]:col-span-2 [&>.fld:has(textarea)]:col-span-2 [&>.fld:has(input[type=file])]:col-span-2" novalidate @submit.prevent="create">
        <h3 class="text-xl">New item</h3>
        <template v-for="f in fields" :key="f.key">
          <AdminMediaField v-if="f.type === 'media'" :model-value="draft[f.key] ?? null" :kind="f.kind || 'page'" :label="f.label" :hint="f.hint || ''" :required="f.required" @update:model-value="setMedia(draft, f.key, $event)" />
          <p v-if="f.type === 'media' && errOf(f, draft)" class="err" role="alert">{{ errOf(f, draft) }}</p>
          <AdminFormField v-else-if="f.type !== 'media'" :name="fid(draft, f.key)" :label="f.label.replace(/ \(optional\)$/i, '')" :required="f.required" :hint="f.hint" :error="errOf(f, draft)" :counter="f.max && f.max >= 100 ? { value: String(draft[f.key] ?? ''), max: f.max } : undefined">
            <template #default="s">
              <textarea v-if="f.type === 'textarea'" :id="s.id" v-model="draft[f.key]" class="inp" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @blur="markLeft(draft, f.key)" />
              <select v-else-if="f.type === 'select'" :id="s.id" v-model="draft[f.key]" class="inp"><option v-for="o in f.options" :key="o">{{ o }}</option></select>
              <input v-else :id="s.id" v-model="draft[f.key]" class="inp" :type="f.type === 'number' ? 'number' : 'text'" :maxlength="f.max" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @blur="markLeft(draft, f.key)">
            </template>
          </AdminFormField>
        </template>
        <p v-if="errors.new" class="err" role="alert">{{ errors.new }}</p>
        <div class="flex gap-3"><button class="btn">Add</button><button type="button" class="btn-secondary" @click="draft = null">Cancel</button></div>
      </form>
    </template>
  </div>
</template>
