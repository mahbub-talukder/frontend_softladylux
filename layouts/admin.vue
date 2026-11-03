<script setup lang="ts">
// SRS ARC-04: separate admin layout. The sidebar only renders for a signed-in staff user.
const auth = useAuthStore()
</script>

<template>
  <div class="flex min-h-screen bg-bg text-ink">
    <AdminSidebar v-if="auth.isStaff" />
    <main class="min-w-0 flex-1 p-8"><slot /></main>
  </div>
</template>
