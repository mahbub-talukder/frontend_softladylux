<script setup lang="ts">
// SRS WEB-08: line icon for a trust strip item. `name` is the admin "Icon name" field (TrustItem.icon);
// unknown or empty names fall back to a check mark, so any value the owner types still renders cleanly.
const props = defineProps<{ name?: string }>()
const PATHS: Record<string, string[]> = {
  truck: ['M3 6h11v9H3z', 'M14 9h4l3 3v3h-7z', 'M7.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'M17.5 18.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z'],
  shield: ['M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z', 'M9 12l2 2 4-4'],
  return: ['M9 14L4 9l5-5', 'M4 9h11a5 5 0 0 1 0 10h-3'],
  ruler: ['M3 15L15 3l6 6L9 21z', 'M7 11l2 2', 'M10 8l1.5 1.5', 'M13 5l2 2'],
  phone: ['M7 2h10a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1z', 'M11 18h2'],
  gift: ['M3 8h18v4H3z', 'M5 12h14v9H5z', 'M12 8v13', 'M12 8C10 4 6.5 4.5 7 7c.3 1 2 1 5 1zM12 8c2-4 5.5-3.5 5-1-.3 1-2 1-5 1z'],
  heart: ['M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z'],
  star: ['M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z'],
  check: ['M5 12.5l4.5 4.5L19 7.5']
}
const paths = computed(() => PATHS[(props.name || '').trim().toLowerCase()] ?? PATHS.check)
</script>

<template>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path v-for="d in paths" :key="d" :d="d" />
  </svg>
</template>
