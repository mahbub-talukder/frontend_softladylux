<script setup lang="ts">
// Bare layout for the print-styled invoice and delivery slip (SRS ORD-08, SD-11, scenario 25):
// no sidebar or header, colours from the theme tokens only (THM-05/11).
// Same admin feedback host and tab title as the admin layout (ADM-07, SET-08); both are hidden when printing.
const { data: site } = useSiteSettings()
useHead({ title: () => `${site.value?.company_name || 'SoftLadyLux'} | Admin Panel` })
</script>

<template>
  <div class="admin-scope min-h-screen bg-admin-bg px-3 py-2 text-ink print:bg-white print:p-0">
    <div class="print:hidden"><AdminLoader /><AdminToasts /></div>
    <slot />
  </div>
</template>
