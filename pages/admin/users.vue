<script setup lang="ts">
// Design: AdminUsers board. SRS ADM-06, PRM-02 (grouped checklist, select/clear/reset, warnings
// on sensitive permissions), PRM-05 (dependencies), PRM-06 (Owner protected). Owner only.
import type { PermissionDef, StaffUser } from '~/types/api'

definePageMeta({ layout: 'admin', ownerOnly: true })
const { api, errorOf, toast } = useApi()
const users = ref<StaffUser[]>([])
const catalogue = ref<PermissionDef[]>([])
const selectedId = ref<number | null>(null)
const checked = ref<Set<string>>(new Set())
const message = ref('')
const error = ref('')
const adding = ref(false)
const draft = reactive({ full_name: '', email: '', password: '' })
const busy = ref(false)
// UI-06 / §10: name required (<= 150), valid email, password >= 8 characters (server validator).
const { required, maxLength, email, minLength } = rules
const addForm = useFormValidation(() => draft, {
  full_name: [required('Enter the staff member’s name.'), maxLength(150)],
  email: [required('Enter an email address.'), email()],
  password: [required('Choose a password.'), minLength(8, 'Use at least 8 characters.')]
})
const resetting = ref(false)
const resetDraft = reactive({ password: '' })
const resetForm = useFormValidation(() => resetDraft, { password: [required('Enter the new password.'), minLength(8, 'Use at least 8 characters.')] })

const IMPLIES: Record<string, string> = {
  'orders.manage': 'orders.view', 'payments.verify': 'orders.view',
  'products.manage': 'products.view', 'inventory.adjust': 'inventory.view'
}
const groups = computed(() => {
  const g = new Map<string, PermissionDef[]>()
  for (const p of catalogue.value) g.set(p.group, [...(g.get(p.group) ?? []), p])
  return [...g]
})
const current = computed(() => users.value.find((u) => u.id === selectedId.value) ?? null)
const isOwnerRow = computed(() => current.value?.role === 'owner')

async function load(keep = true) {
  const [u, c] = await Promise.all([
    api<{ results: StaffUser[] }>('/admin/users/?page_size=100'), api<PermissionDef[]>('/admin/permissions/')
  ])
  users.value = u.results; catalogue.value = c
  const id = keep && users.value.some((x) => x.id === selectedId.value) ? selectedId.value : users.value[0]?.id
  pick(id ?? null)
}
function pick(id: number | null) {
  selectedId.value = id
  checked.value = new Set(users.value.find((u) => u.id === id)?.permissions ?? [])
  message.value = ''; error.value = ''
}
await load(false)

function toggle(p: PermissionDef) {
  if (isOwnerRow.value) return
  const s = new Set(checked.value)
  if (s.has(p.code)) {
    s.delete(p.code)
    // PRM-05: removing a view permission also removes what depends on it.
    for (const [k, v] of Object.entries(IMPLIES)) if (v === p.code) s.delete(k)
  } else {
    if (p.sensitive && !confirm(`"${p.code}" is a sensitive permission. Grant it?`)) return // PRM-02
    s.add(p.code); if (IMPLIES[p.code]) s.add(IMPLIES[p.code])
  }
  checked.value = s
}
const selectAll = () => { if (!isOwnerRow.value) checked.value = new Set(catalogue.value.map((p) => p.code)) }
const clearAll = () => { if (!isOwnerRow.value) checked.value = new Set() }
const resetDefault = () => { if (!isOwnerRow.value) checked.value = new Set(catalogue.value.filter((p) => p.default).map((p) => p.code)) }

async function save() {
  if (!current.value) return
  try {
    const r = await api<{ permissions: string[] }>(`/admin/users/${current.value.id}/permissions/`, { method: 'PUT', body: { permissions: [...checked.value] } })
    checked.value = new Set(r.permissions); message.value = 'Permissions saved. They apply on the staff member’s next request.'
    toast.success('Permissions saved', ['They apply on the staff member’s next request.'])
    await load()
  } catch (e) { error.value = errorOf(e).message }
}
async function addStaff() {
  error.value = ''
  if (!addForm.validateAll()) { toast.error('Please fix the highlighted fields', addForm.summary.value.slice(0, 3)); return }
  busy.value = true
  try {
    const u = await api<StaffUser>('/admin/users/', { method: 'POST', body: { ...draft, email: draft.email.trim().toLowerCase(), full_name: draft.full_name.trim() }, successMessage: 'Staff user created' })
    adding.value = false; Object.assign(draft, { full_name: '', email: '', password: '' }); addForm.reset()
    await load(); pick(u.id)
  } catch (e) { const er = errorOf(e); addForm.setServerErrors(er); error.value = er.flat.join(' ') } finally { busy.value = false }
}
async function toggleActive() {
  const u = current.value
  if (!u || !confirm(u.is_active ? `Deactivate ${u.full_name}? They are signed out at once.` : `Reactivate ${u.full_name}?`)) return // ADM-08
  try { await api(`/admin/users/${u.id}/`, { method: 'PATCH', body: { is_active: !u.is_active }, successMessage: u.is_active ? `${u.full_name || u.email} deactivated` : `${u.full_name || u.email} reactivated` }); await load() } catch { /* toast shown */ }
}
function openReset() { resetting.value = true; resetDraft.password = ''; resetForm.reset(); error.value = '' }
async function resetPassword() {
  const u = current.value
  if (!u) return
  if (!resetForm.validateAll()) return
  busy.value = true
  try {
    await api(`/admin/users/${u.id}/reset-password/`, { method: 'POST', body: { password: resetDraft.password }, successMessage: 'Password reset' })
    message.value = 'Password reset.'; resetting.value = false; resetDraft.password = ''
  } catch (e) { const er = errorOf(e); resetForm.setServerErrors(er); error.value = er.flat.join(' ') } finally { busy.value = false }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Owner only" title="Staff & permissions" />
    <div class="grid gap-6 lg:grid-cols-[280px_1fr]">
      <div class="card">
        <h2 class="text-2xl">Users</h2>
        <button v-for="u in users" :key="u.id" class="flex flex-col border p-3 text-left" :class="u.id === selectedId ? 'border-primary' : 'border-border'" :aria-pressed="u.id === selectedId" @click="pick(u.id)">
          <span>{{ u.full_name || u.email }}</span>
          <span class="hint">{{ u.role === 'owner' ? 'Owner' : u.is_active ? 'Staff' : 'Staff · inactive' }}</span>
        </button>
        <button class="btn-secondary" @click="adding = !adding">+ Add staff user</button>
        <form v-if="adding" class="flex flex-col gap-3" novalidate @submit.prevent="addStaff">
          <AdminFormField name="full_name" label="Name" required :error="addForm.errorFor('full_name')">
            <template #default="f"><input :id="f.id" v-model="draft.full_name" class="inp" maxlength="150" :aria-invalid="f.invalid" :aria-describedby="f.describedby" @input="addForm.onInput('full_name')" @blur="addForm.touch('full_name')"></template>
          </AdminFormField>
          <AdminFormField name="email" label="Email" required :error="addForm.errorFor('email')">
            <template #default="f"><input :id="f.id" v-model="draft.email" type="email" class="inp" autocomplete="off" :aria-invalid="f.invalid" :aria-describedby="f.describedby" @input="addForm.onInput('email')" @blur="addForm.touch('email')"></template>
          </AdminFormField>
          <AdminFormField name="password" label="Password" required hint="At least 8 characters." :error="addForm.errorFor('password')">
            <template #default="f"><input :id="f.id" v-model="draft.password" type="password" class="inp" autocomplete="new-password" :aria-invalid="f.invalid" :aria-describedby="f.describedby" @input="addForm.onInput('password')" @blur="addForm.touch('password')"></template>
          </AdminFormField>
          <p class="hint">New staff start with the default permissions; adjust them after saving.</p>
          <button class="btn btn-spin" :disabled="busy" :aria-busy="busy">Create</button>
        </form>
      </div>
      <div v-if="current" class="card">
        <h2 class="text-2xl">{{ current.full_name || current.email }} — permissions</h2>
        <p v-if="isOwnerRow" class="hint">The Owner always has every permission. These cannot be changed or removed.</p>
        <div v-for="[group, perms] in groups" :key="group" class="flex flex-col gap-1">
          <h3 class="cap mt-2">{{ group }}</h3>
          <div class="grid gap-x-6 sm:grid-cols-2 2xl:grid-cols-3">
          <button
            v-for="p in perms" :key="p.code" type="button" role="checkbox" :aria-checked="isOwnerRow || checked.has(p.code)"
            class="flex min-h-12 items-start gap-3 border-b border-border py-2.5 text-left transition-colors hover:bg-cream/50" @click="toggle(p)"
          >
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border text-[13px] text-bg" :class="isOwnerRow || checked.has(p.code) ? 'border-ink bg-ink' : 'border-text-dark-3'">{{ isOwnerRow || checked.has(p.code) ? '✓' : '' }}</span>
            <span><span class="block text-[14.5px]">{{ p.description }}</span><span class="block text-xs text-muted">{{ p.code }}</span><span v-if="p.sensitive" class="block text-xs text-accent">Sensitive: confirm before granting</span></span>
          </button>
          </div>
        </div>
        <p class="hint">Changes apply the next time the staff member opens a page. Users, permissions and the audit log are Owner-only. Every change is written to the audit log.</p>
        <div v-if="!isOwnerRow" class="flex flex-wrap gap-3">
          <button class="btn" data-track="permissions_save" @click="save">Save permissions</button>
          <button class="btn-secondary" @click="selectAll">Select all</button>
          <button class="btn-secondary" @click="clearAll">Clear all</button>
          <button class="btn-secondary" @click="resetDefault">Reset to defaults</button>
          <button class="btn-secondary" @click="openReset">Reset password</button>
          <button class="btn-secondary" @click="toggleActive">{{ current.is_active ? 'Deactivate' : 'Reactivate' }}</button>
        </div>
        <form v-if="resetting && !isOwnerRow" class="flex max-w-sm flex-col gap-3 border border-border p-4" novalidate @submit.prevent="resetPassword">
          <h3 class="text-xl">New password for {{ current.full_name || current.email }}</h3>
          <AdminFormField name="reset_password" label="New password" required hint="At least 8 characters. The staff member is not notified." :error="resetForm.errorFor('password')">
            <template #default="f"><input :id="f.id" v-model="resetDraft.password" type="password" class="inp" autocomplete="new-password" :aria-invalid="f.invalid" :aria-describedby="f.describedby" @input="resetForm.onInput('password')" @blur="resetForm.touch('password')"></template>
          </AdminFormField>
          <div class="flex gap-3"><button class="btn btn-spin" :disabled="busy" :aria-busy="busy">Reset password</button><button type="button" class="btn-secondary" @click="resetting = false">Cancel</button></div>
        </form>
        <p v-if="message" class="hint" role="status">{{ message }}</p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
      </div>
    </div>
  </section>
</template>
