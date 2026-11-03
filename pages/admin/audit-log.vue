<script setup lang="ts">
// SRS ADM-10: Owner-only, read-only, paginated audit trail.
import type { AuditRow, Paged } from '~/types/api'

definePageMeta({ layout: 'admin', ownerOnly: true })
const { api } = useApi()
const page = ref(1)
const data = ref<Paged<AuditRow>>({ count: 0, results: [] })
async function load() { data.value = await api<Paged<AuditRow>>(`/admin/audit-log/?page=${page.value}`) }
await load()
const pages = computed(() => Math.max(1, Math.ceil(data.value.count / 20)))
async function go(n: number) { page.value = n; await load() }
</script>

<template>
  <section>
    <AdminHeading eyebrow="Owner only" title="Audit log" />
    <div class="card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead><tr class="cap"><th class="p-2">When</th><th class="p-2">Who</th><th class="p-2">Action</th><th class="p-2">What</th></tr></thead>
        <tbody>
          <tr v-for="r in data.results" :key="r.id" class="border-t border-border">
            <td class="p-2">{{ new Date(r.created_at).toLocaleString() }}</td><td class="p-2">{{ r.user || '—' }}</td>
            <td class="p-2">{{ r.action }}</td><td class="p-2">{{ r.model }} {{ r.object_id }}</td>
          </tr>
          <tr v-if="!data.results.length"><td colspan="4" class="p-4 text-muted">No changes recorded yet.</td></tr>
        </tbody>
      </table>
      <div class="flex items-center gap-3">
        <button class="btn-secondary" :disabled="page <= 1" @click="go(page - 1)">Previous</button>
        <span class="hint">Page {{ page }} of {{ pages }}</span>
        <button class="btn-secondary" :disabled="page >= pages" @click="go(page + 1)">Next</button>
      </div>
    </div>
  </section>
</template>
