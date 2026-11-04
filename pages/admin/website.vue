<script setup lang="ts">
// Design: AdminWebsite board. SRS ADM-04, WEB-01..08, WEB-10. Needs website.manage.
// The home layout is fixed (WEB-06): no section ordering here. Categories arrive in M2.
import type { FieldDef } from '~/components/admin/ContentList.vue'

definePageMeta({ layout: 'admin', permission: 'website.manage' })

const LINK_TYPES = ['url', 'category', 'product']
const TABS: { id: string; label: string; endpoint: string; titleKey: string; canCreate: boolean; canDelete: boolean; note?: string; fields: FieldDef[]; defaults?: Record<string, unknown> }[] = [
  { id: 'carousel', label: 'Carousel', endpoint: '/admin/website/carousel/', titleKey: 'heading', canCreate: true, canDelete: true,
    note: 'Up to 8 slides can be on at once. Recommended image size 1600 × 900 px (mobile crop 800 × 1000 px, optional).',
    defaults: { link_type: 'url' }, fields: [
      { key: 'media', label: 'Image', type: 'media', kind: 'carousel', hint: '1600 × 900 px' },
      { key: 'mobile_media', label: 'Mobile image (optional)', type: 'media', kind: 'carousel', hint: '800 × 1000 px' },
      { key: 'eyebrow', label: 'Eyebrow text' }, { key: 'heading', label: 'Heading' }, { key: 'subtext', label: 'Sub-text' },
      { key: 'button_label', label: 'Button label' }, { key: 'link_type', label: 'Link type', type: 'select', options: LINK_TYPES },
      { key: 'link_value', label: 'Link target (slug or URL)' }] },
  { id: 'banners', label: 'Banners', endpoint: '/admin/website/banners/', titleKey: 'placement', canCreate: false, canDelete: false,
    note: 'Two fixed placements: home promo and home offer.', fields: [
      { key: 'media', label: 'Image', type: 'media', kind: 'banner', hint: '1200 × 600 px' },
      { key: 'heading', label: 'Heading' }, { key: 'text', label: 'Text' }, { key: 'link', label: 'Link' }] },
  { id: 'videos', label: 'Videos', endpoint: '/admin/website/videos/', titleKey: 'title', canCreate: true, canDelete: true,
    note: 'Paste a YouTube, Facebook or direct video link.', fields: [
      { key: 'title', label: 'Title' }, { key: 'url', label: 'Video URL' },
      { key: 'thumbnail', label: 'Thumbnail', type: 'media', kind: 'video_thumb', hint: '640 × 360 px' }] },
  { id: 'announcements', label: 'Announcement bar', endpoint: '/admin/website/announcements/', titleKey: 'text', canCreate: true, canDelete: true,
    fields: [{ key: 'text', label: 'Message' }, { key: 'link', label: 'Link (optional)' }] },
  { id: 'trust', label: 'Trust strip', endpoint: '/admin/website/trust/', titleKey: 'title', canCreate: true, canDelete: true,
    fields: [{ key: 'icon', label: 'Icon name' }, { key: 'title', label: 'Title' }, { key: 'text', label: 'Text' }] },
  { id: 'pages', label: 'Static pages', endpoint: '/admin/website/pages/', titleKey: 'title', canCreate: false, canDelete: false,
    note: 'About, Delivery & Returns, Privacy and Terms. They are shown in the footer.', fields: [
      { key: 'title', label: 'Title' }, { key: 'body', label: 'Content (HTML)', type: 'textarea' }] }
]
const tab = ref(TABS[0].id)
const current = computed(() => TABS.find((t) => t.id === tab.value))

// WEB-06: home sections on/off. The server skips a section that is off, so it adds no load time.
const { api, errorOf } = useApi()
const sections = ref<{ key: string; label: string; on: boolean }[]>([])
const sectionMsg = ref('')
const sectionErr = ref('')
onMounted(async () => { try { sections.value = await api('/admin/website/home-sections/') } catch { sectionErr.value = 'Home sections could not be loaded.' } })
async function toggleSection(s: { key: string; on: boolean }) {
  sectionMsg.value = ''; sectionErr.value = ''
  const next = !s.on
  s.on = next
  try { sections.value = await api('/admin/website/home-sections/', { method: 'PUT', body: { [s.key]: next } }); sectionMsg.value = 'Saved. The storefront updates within a minute.' }
  catch (e) { s.on = !next; sectionErr.value = errorOf(e).message }
}
</script>

<template>
  <section>
    <AdminHeading eyebrow="Website management" title="Storefront content">
      <NuxtLink to="/" class="btn-secondary" target="_blank">Preview site</NuxtLink>
    </AdminHeading>
    <div class="mb-4 flex flex-wrap border-b border-border" role="tablist">
      <button v-for="t in TABS" :key="t.id" class="tab" :aria-pressed="tab === t.id" @click="tab = t.id">{{ t.label }}</button>
      <button class="tab" :aria-pressed="tab === 'sections'" @click="tab = 'sections'">Home sections</button>
    </div>
    <div v-if="tab === 'sections'" class="card max-w-2xl !gap-1.5">
      <h2 class="font-display">Home page sections</h2>
      <p class="hint mb-2">The home layout is fixed. Switch each section on or off; a section that is off is not loaded at all, so the home page stays fast.</p>
      <div v-for="x in sections" :key="x.key" class="flex min-h-12 items-center justify-between gap-3 border-b border-border">
        <span class="text-[15px]">{{ x.label }}</span>
        <button type="button" role="switch" class="switch" :aria-checked="x.on" :aria-label="x.label" @click="toggleSection(x)" />
      </div>
      <p v-if="sectionMsg" class="mt-2 text-sm" role="status">{{ sectionMsg }}</p><p v-if="sectionErr" class="err mt-2" role="alert">{{ sectionErr }}</p>
    </div>
    <div v-else-if="current" class="max-w-2xl">
      <AdminContentList :key="current.id" :endpoint="current.endpoint" :fields="current.fields" :title-key="current.titleKey" :can-create="current.canCreate" :can-delete="current.canDelete" :defaults="current.defaults" :note="current.note" />
    </div>
  </section>
</template>
