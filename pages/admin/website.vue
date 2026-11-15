<script setup lang="ts">
// Design: AdminWebsite board. SRS ADM-04, WEB-01..08, WEB-10. Needs website.manage.
// The home layout is fixed (WEB-06): no section ordering here. Categories arrive in M2.
import type { FieldDef } from '~/components/admin/ContentList.vue'

definePageMeta({ layout: 'admin', permission: 'website.manage' })

const LINK_TYPES = ['url', 'category', 'product']
const BANNER_TITLES = { home_promo: 'Home promo banner', home_offer: 'Home offer banner', signature: 'Signature collection (big panel)', popup: 'Promotional popup' }
type Tab = { id: string; label: string; endpoint: string; titleKey: string; canCreate: boolean; canDelete: boolean; note?: string; fields: FieldDef[]; defaults?: Record<string, unknown>; query?: Record<string, string>; titles?: Record<string, string>; hideSort?: boolean }
const TABS: Tab[] = [
  { id: 'carousel', label: 'Carousel', endpoint: '/admin/website/carousel/', titleKey: 'heading', canCreate: true, canDelete: true,
    note: 'Up to 8 slides can be on at once. Recommended 1600 × 900 px (desktop) and 800 × 1000 px (mobile, optional). The picture fills a fixed box and is cropped from the centre, so keep the subject in the middle.',
    defaults: { link_type: 'url' }, fields: [
      { key: 'media', label: 'Image', type: 'media', kind: 'carousel', hint: '1600 × 900 px, centre stays visible', required: true },
      { key: 'mobile_media', label: 'Mobile image (optional)', type: 'media', kind: 'carousel', hint: '800 × 1000 px, phones only' },
      { key: 'eyebrow', label: 'Eyebrow text', max: 80 }, { key: 'heading', label: 'Heading', max: 120 }, { key: 'subtext', label: 'Sub-text', max: 240 },
      { key: 'button_label', label: 'Button label', max: 40 }, { key: 'link_type', label: 'Link type', type: 'select', options: LINK_TYPES },
      { key: 'link_value', label: 'Link target (slug or URL)', max: 300 }] },
  // WEB-02 (v1.6): home promo, home offer and the big Signature collection panel
  { id: 'banners', label: 'Banners', endpoint: '/admin/website/banners/', titleKey: 'placement', canCreate: false, canDelete: false,
    query: { placement: 'home_promo,home_offer,signature' }, titles: BANNER_TITLES, hideSort: true,
    note: 'Fixed placements. Home promo and Home offer are shown side by side, whole and uncropped, in the shape of the uploaded picture: use the same size for both (1200 × 600 px recommended) so they line up. Signature collection: the big panel beside the Signature products, 800 × 1000 px (portrait); while it has no image the drawn panel is shown. The button label is used by the Signature panel.', fields: [
      { key: 'media', label: 'Image', type: 'media', kind: 'banner', hint: 'See the sizes above' },
      { key: 'heading', label: 'Heading', max: 120 }, { key: 'text', label: 'Text', max: 240 },
      { key: 'button_label', label: 'Button label', max: 40 }, { key: 'link', label: 'Link', max: 300, hint: 'A page on this site such as /shop/new, or a full https:// link' }] },
  // WEB-11 (v1.6): one promotional popup, shown on every home page load while it is on
  { id: 'promo', label: 'Promotional Ads Panel', endpoint: '/admin/website/banners/', titleKey: 'placement', canCreate: false, canDelete: false,
    query: { placement: 'popup' }, titles: BANNER_TITLES, hideSort: true,
    note: 'A popup that opens shortly after the home page loads, every time it is loaded, until the visitor closes it. It needs an image and the switch on; switch it off to stop showing it. Any shape works and the picture is never cropped (800 × 800 px or 800 × 1000 px suit it best); add a heading, text and button to show them beside the image (image only works too).', fields: [
      { key: 'media', label: 'Promotional image', type: 'media', kind: 'banner', hint: '800 × 800 px, JPG/PNG/WebP up to 5 MB', required: true },
      { key: 'heading', label: 'Heading', max: 120 }, { key: 'text', label: 'Promotional text', type: 'textarea', max: 240 },
      { key: 'button_label', label: 'Button label', max: 40, hint: 'Default: Shop now' }, { key: 'link', label: 'Button link', max: 300, hint: 'A page on this site such as /shop/offers, or a full https:// link' }] },
  { id: 'videos', label: 'Videos', endpoint: '/admin/website/videos/', titleKey: 'title', canCreate: true, canDelete: true,
    note: 'Paste a YouTube, Vimeo or direct video link (.mp4/.webm). It plays in place on the home page. Other links open in the same tab.', fields: [
      { key: 'title', label: 'Title', required: true, max: 120 }, { key: 'url', label: 'Video URL', required: true, url: true, max: 200 },
      { key: 'thumbnail', label: 'Thumbnail', type: 'media', kind: 'video_thumb', hint: 'Optional, 640 × 360 px. YouTube videos use their own thumbnail when this is empty.' }] },
  { id: 'announcements', label: 'Announcement bar', endpoint: '/admin/website/announcements/', titleKey: 'text', canCreate: true, canDelete: true,
    fields: [{ key: 'text', label: 'Message', required: true, max: 200 }, { key: 'link', label: 'Link (optional)', max: 300 }] },
  { id: 'trust', label: 'Trust strip', endpoint: '/admin/website/trust/', titleKey: 'title', canCreate: true, canDelete: true,
    fields: [{ key: 'icon', label: 'Icon name', max: 40 }, { key: 'title', label: 'Title', required: true, max: 80 }, { key: 'text', label: 'Text', max: 200 }] },
  { id: 'pages', label: 'Static pages', endpoint: '/admin/website/pages/', titleKey: 'title', canCreate: false, canDelete: false,
    note: 'About, Delivery & Returns, Privacy and Terms. They are shown in the footer.', fields: [
      { key: 'title', label: 'Title', required: true, max: 120 }, { key: 'body', label: 'Content (HTML)', type: 'textarea' }] }
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
  try { sections.value = await api('/admin/website/home-sections/', { method: 'PUT', body: { [s.key]: next }, successMessage: 'Saved. The storefront updates within a minute.', toast: false }); sectionMsg.value = 'Saved. The storefront updates within a minute.' }
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
      <AdminContentList :key="current.id" :endpoint="current.endpoint" :fields="current.fields" :title-key="current.titleKey" :can-create="current.canCreate" :can-delete="current.canDelete" :defaults="current.defaults" :note="current.note" :query="current.query" :titles="current.titles" :hide-sort="current.hideSort" />
    </div>
  </section>
</template>
