<script setup lang="ts">
// SRS ARC-04: separate admin layout. The sidebar only renders for a signed-in staff user.
// ADM-09 / AdminMobile board: on a phone the sidebar becomes a slide-in menu behind a header button,
// so the dashboard and orders are usable in a mobile browser.
// ADM-07 / UI-06: global loading bar + toast host live here; browser tab title is "{company} | Admin Panel" (SET-08).
const auth = useAuthStore()
const route = useRoute()
const ui = useAdminUi()
const open = ref(false)
watch(() => route.fullPath, () => { open.value = false })

const { data: site } = useSiteSettings()
const siteName = computed(() => site.value?.company_name || 'SoftLadyLux')
useHead({ title: () => `${siteName.value} | Admin Panel` })
</script>

<template>
  <div class="admin-scope min-h-screen bg-admin-bg text-ink lg:flex">
    <AdminLoader />
    <AdminToasts />
    <header v-if="auth.isStaff" class="sticky top-0 z-20 flex items-center justify-between bg-dark px-4 py-2 text-on-dark lg:hidden">
      <span class="min-w-0 truncate font-display text-2xl tracking-[0.06em]">{{ siteName }} <span class="ml-1 text-[10px] uppercase not-italic tracking-[0.3em] text-champagne">Admin</span></span>
      <button class="flex h-11 w-11 items-center justify-center text-xl" :aria-expanded="open" aria-controls="admin-menu" aria-label="Menu" @click="open = !open">☰</button>
    </header>
    <div v-if="auth.isStaff" id="admin-menu" class="fixed inset-y-0 left-0 z-40 w-[264px] -translate-x-full overflow-y-auto transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:flex-none lg:translate-x-0" :class="open ? '!translate-x-0' : ''">
      <AdminSidebar :site-name="siteName" />
    </div>
    <div v-if="open" class="fixed inset-0 z-30 bg-ink/50 lg:hidden" aria-hidden="true" @click="open = false" />
    <main id="admin-main" tabindex="-1" :aria-busy="ui.pending > 0" class="admin-main min-w-0 flex-1 p-4 outline-none sm:p-6 lg:px-10 lg:pb-14 lg:pt-8"><slot /></main>
  </div>
</template>
