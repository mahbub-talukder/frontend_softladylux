<script setup lang="ts">
// SRS ARC-04: separate admin layout. The sidebar only renders for a signed-in staff user.
// ADM-09 / AdminMobile board: on a phone the sidebar becomes a slide-in menu behind a header button,
// so the dashboard and orders are usable in a mobile browser.
const auth = useAuthStore()
const route = useRoute()
const open = ref(false)
watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <div class="min-h-screen bg-bg text-ink lg:flex">
    <header v-if="auth.isStaff" class="flex items-center justify-between bg-dark px-4 py-3 text-on-dark lg:hidden">
      <span class="font-display text-xl">SoftLadyLux Admin</span>
      <button class="min-h-touch min-w-touch" :aria-expanded="open" aria-controls="admin-menu" aria-label="Menu" @click="open = !open">☰</button>
    </header>
    <div v-if="auth.isStaff" id="admin-menu" class="fixed inset-y-0 left-0 z-40 w-64 -translate-x-full overflow-y-auto transition-transform lg:static lg:translate-x-0" :class="open ? '!translate-x-0' : ''">
      <AdminSidebar />
    </div>
    <div v-if="open" class="fixed inset-0 z-30 bg-dark/50 lg:hidden" aria-hidden="true" @click="open = false" />
    <main class="min-w-0 flex-1 p-4 lg:p-8"><slot /></main>
  </div>
</template>
