<script setup lang="ts">
// SRS v1.7 CRR-16: courier steps under the order status timeline, newest first, plus a link to the
// courier's own tracking page. Data comes from our API only (no live courier call).
import type { CourierStep } from '~/types/api'

const props = defineProps<{ steps?: CourierStep[]; link?: string }>()
const shown = computed(() => props.steps ?? [])
const when = (d: string) => new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
</script>

<template>
  <div v-if="shown.length || link" class="flex flex-col gap-3 border-t border-border pt-5" aria-label="Courier updates">
    <div class="flex flex-wrap items-baseline justify-between gap-2">
      <span class="sf-lbl">Courier updates</span>
      <a v-if="link" :href="link" target="_blank" rel="noopener" class="text-[13.5px] font-medium text-accent underline underline-offset-[3px]" data-track="track_courier_link">Track on Steadfast ↗</a>
    </div>
    <ol v-if="shown.length" class="flex flex-col gap-2.5">
      <li v-for="(s, i) in shown" :key="s.at + s.text" class="flex gap-3 text-[14.5px] leading-snug">
        <span class="mt-[5px] h-2.5 w-2.5 flex-none rounded-full" :class="i === 0 ? 'bg-gold' : 'border border-gold'" />
        <div><div :class="i === 0 ? 'font-medium' : 'text-body'">{{ s.text }}</div><div class="text-[13px] text-muted">{{ when(s.at) }}</div></div>
      </li>
    </ol>
  </div>
</template>
