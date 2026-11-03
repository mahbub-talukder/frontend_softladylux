<script setup lang="ts">
// Design: AdminUsers board. SRS ADM-06, PRM-02 (grouped checklist, select/clear/reset, warnings
// on sensitive permissions), PRM-05 (dependencies), PRM-06 (Owner protected). Owner only.
import type { PermissionDef, StaffUser } from '~/types/api'

definePageMeta({ layout: 'admin', ownerOnly: true })
const { api, errorOf } = useApi()
const users = ref<StaffUser[]>([])
const catalogue = ref<PermissionDef[]>([])
const selectedId = ref<number | null>(null)
const checked = ref<Set<string>>(new Set())
const message = ref('')
const error = ref('')
const adding = ref(false)
const draft = reactive({ full_name: '', email: '', password: '' })

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
    await load()
  } catch (e) { error.value = errorOf(e).message }
}
async function addStaff() {
  error.value = ''
  try {
    const u = await api<StaffUser>('/admin/users/', { method: 'POST', body: { ...draft } })
    adding.value = false; Object.assign(draft, { full_name: '', email: '', password: '' })
    await load(); pick(u.id)
  } catch (e) { const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message }
}
async function toggleActive() {
  const u = current.value
  if (!u || !confirm(u.is_active ? `Deactivate ${u.full_name}? They are signed out at once.` : `Reactivate ${u.full_name}?`)) return // ADM-08
  await api(`/admin/users/${u.id}/`, { method: 'PATCH', body: { is_active: !u.is_active } }); await load()
}
async function resetPassword() {
  const u = current.value
  const pw = u && prompt(`New password for ${u.full_name} (min 8 characters)`)
  if (!u || !pw) return
  try { await api(`/admin/users/${u.id}/reset-password/`, { method: 'POST', body: { password: pw } }); message.value = 'Password reset.' }
  catch (e) { const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message }
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
        <form v-if="adding" class="flex flex-col gap-3" @submit.prevent="addStaff">
          <div class="fld"><label for="n">Name</label><input id="n" v-model="draft.full_name" class="inp" required></div>
          <div class="fld"><label for="e">Email</label><input id="e" v-model="draft.email" type="email" class="inp" required></div>
          <div class="fld"><label for="p">Password</label><input id="p" v-model="draft.password" type="password" class="inp" autocomplete="new-password" required></div>
          <p class="hint">New staff start with the default permissions; adjust them after saving.</p>
          <button class="btn">Create</button>
        </form>
      </div>
      <div v-if="current" class="card">
        <h2 class="text-2xl">{{ current.full_name || current.email }} — permissions</h2>
        <p v-if="isOwnerRow" class="hint">The Owner always has every permission. These cannot be changed or removed.</p>
        <div v-for="[group, perms] in groups" :key="group" class="flex flex-col gap-2">
          <h3 class="cap">{{ group }}</h3>
          <button
            v-for="p in perms" :key="p.code" type="button" role="checkbox" :aria-checked="isOwnerRow || checked.has(p.code)"
            class="flex min-h-touch items-start gap-3 border border-border p-3 text-left" @click="toggle(p)"
          >
            <span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-primary" :class="isOwnerRow || checked.has(p.code) ? 'bg-primary text-primary-contrast' : ''">{{ isOwnerRow || checked.has(p.code) ? '✓' : '' }}</span>
            <span><span class="block text-sm font-medium">{{ p.code }}<span v-if="p.sensitive" title="Sensitive permission" aria-label="Sensitive permission"> ⚠</span></span><span class="hint">{{ p.description }}</span></span>
          </button>
        </div>
        <p class="hint">Changes apply the next time the staff member opens a page. Users, permissions and the audit log are Owner-only. Every change is written to the audit log.</p>
        <div v-if="!isOwnerRow" class="flex flex-wrap gap-3">
          <button class="btn" data-track="permissions_save" @click="save">Save permissions</button>
          <button class="btn-secondary" @click="selectAll">Select all</button>
          <button class="btn-secondary" @click="clearAll">Clear all</button>
          <button class="btn-secondary" @click="resetDefault">Reset to defaults</button>
          <button class="btn-secondary" @click="resetPassword">Reset password</button>
          <button class="btn-secondary" @click="toggleActive">{{ current.is_active ? 'Deactivate' : 'Reactivate' }}</button>
        </div>
        <p v-if="message" class="hint" role="status">{{ message }}</p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
      </div>
    </div>
  </section>
</template>
