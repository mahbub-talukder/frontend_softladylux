<script setup lang="ts">
// SRS NTF-01 / NTF-04, §2.2 contact.manage. No design board exists for this screen: built from the
// SRS in the existing admin table style. Contact messages (mark handled) and newsletter export.
import type { ContactMessage, Dict, Paged } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'contact.manage' })
const { api } = useApi()
const { download } = useDownload()
const tab = ref<'messages' | 'newsletter'>('messages')
const handled = ref('')
const page = ref(1)
const open = ref<ContactMessage | null>(null)
const { data, refresh } = await useAsyncData('contact-messages', () => api<Paged<ContactMessage>>('/admin/contact-messages/', { query: { handled: handled.value || undefined, page: page.value } }), { watch: [page] })
const { data: subs } = await useAsyncData('newsletter', () => api<Paged<Dict>>('/admin/newsletter/'))
const pages = computed(() => Math.max(1, Math.ceil((data.value?.count ?? 0) / 20)))
const when = (d: string) => new Date(d).toLocaleString()
const exportCsv = () => download('/admin/newsletter/export/', {}, 'newsletter-subscribers.csv')
function filter(v: string) { handled.value = v; page.value = 1; refresh() }
async function mark(m: ContactMessage, v: boolean) {
  try { open.value = await api<ContactMessage>(`/admin/contact-messages/${m.id}/`, { method: 'PATCH', body: { is_handled: v }, successMessage: v ? 'Marked as handled' : 'Reopened' }); await refresh() } catch { /* toast shown by api() */ }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Customers" title="Messages & newsletter"><button v-if="tab === 'newsletter'" type="button" class="btn-secondary" @click="exportCsv">Export CSV</button></AdminHeading>
    <div class="mb-4 flex border-b border-border" role="tablist"><button class="tab" :aria-pressed="tab === 'messages'" @click="tab = 'messages'">Contact messages {{ data?.count ?? 0 }}</button><button class="tab" :aria-pressed="tab === 'newsletter'" @click="tab = 'newsletter'">Newsletter {{ subs?.count ?? 0 }}</button></div>

    <div v-if="tab === 'messages'" class="grid gap-6 xl:grid-cols-[1fr_420px]">
      <div>
        <div class="mb-3 flex gap-2"><button v-for="o in ([['', 'All'], ['0', 'Open'], ['1', 'Handled']] as const)" :key="o[0]" class="min-h-touch border px-3 text-sm" :class="handled === o[0] ? 'border-primary bg-primary-soft' : 'border-border'" @click="filter(o[0])">{{ o[1] }}</button></div>
        <div class="overflow-x-auto border border-border bg-surface"><table class="w-full text-left text-sm">
          <thead><tr class="cap"><th class="p-3">From</th><th class="p-3">Subject</th><th class="p-3">Received</th><th class="p-3">Status</th></tr></thead>
          <tbody>
            <tr v-for="m in data?.results" :key="m.id" class="cursor-pointer border-t border-border" :class="open?.id === m.id ? 'bg-primary-soft' : ''" @click="open = m"><td class="p-3">{{ m.name }}<br><span class="hint">{{ m.email }}</span></td><td class="p-3">{{ m.subject || '—' }}</td><td class="p-3">{{ when(m.created_at) }}</td><td class="p-3">{{ m.is_handled ? 'Handled' : 'Open' }}</td></tr>
            <tr v-if="!data?.results.length"><td colspan="4" class="p-6 text-center text-muted">No messages.</td></tr>
          </tbody>
        </table></div>
        <div class="mt-4 flex items-center gap-3"><button class="btn-secondary" :disabled="page <= 1" @click="page--">Previous</button><span class="hint">Page {{ page }} of {{ pages }}</span><button class="btn-secondary" :disabled="page >= pages" @click="page++">Next</button></div>
      </div>
      <aside v-if="open" class="card"><h2 class="text-2xl">{{ open.subject || 'Message' }}</h2><p class="hint">{{ open.name }} · {{ open.email }}<template v-if="open.phone"> · {{ open.phone }}</template><br>{{ when(open.created_at) }}</p><p class="whitespace-pre-wrap">{{ open.message }}</p>
        <p v-if="open.handled_by_name" class="hint">Handled by {{ open.handled_by_name }}</p>
        <button class="btn" @click="mark(open, !open.is_handled)">{{ open.is_handled ? 'Mark as open' : 'Mark as handled' }}</button><a :href="`mailto:${open.email}`" class="btn-secondary">Reply by email</a></aside>
    </div>
    <div v-else class="overflow-x-auto border border-border bg-surface"><table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-3">Email</th><th class="p-3">Subscribed</th></tr></thead><tbody><tr v-for="s in subs?.results" :key="s.id" class="border-t border-border"><td class="p-3">{{ s.email }}</td><td class="p-3">{{ when(s.subscribed_at) }}</td></tr><tr v-if="!subs?.results.length"><td colspan="2" class="p-6 text-center text-muted">No subscribers yet.</td></tr></tbody></table></div>
  </section>
</template>
