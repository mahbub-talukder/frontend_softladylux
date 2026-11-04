<script setup lang="ts">
// Bare layout for the print-styled invoice and delivery slip (SRS ORD-08, SD-11, scenario 25):
// no sidebar or header, colours from the theme tokens only (THM-05/11).
</script>

<template>
  <div class="min-h-screen bg-surface text-ink print:bg-white"><slot /></div>
</template>
