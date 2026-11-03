<script setup lang="ts">
// SRS PRM-04: opening a forbidden URL shows a "no access" page.
definePageMeta({ layout: 'admin' })
</script>

<template>
  <section>
    <h1 class="text-4xl">No access</h1>
    <p class="mt-2 text-muted">Your account does not have permission to open this page. Ask the Owner if you need it.</p>
    <NuxtLink to="/admin" class="btn-secondary mt-6">Back to dashboard</NuxtLink>
  </section>
</template>
