<script setup lang="ts">
// SRS ADM-02: real widgets arrive with orders/inventory (M3/M5). M1 shows a permission-aware shell.
definePageMeta({ layout: 'admin', permission: 'dashboard.view' })
const auth = useAuthStore()
</script>

<template>
  <section>
    <AdminHeading eyebrow="Overview" title="Dashboard" />
    <div class="card">
      <p>Welcome, {{ auth.me?.full_name }}.</p>
      <p class="hint">Order, payment and stock widgets appear here once those areas are built.</p>
    </div>
  </section>
</template>
