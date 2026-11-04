<script setup lang="ts">
// Design: AdminDashboard / AdminReports bar charts. Plain CSS bars (no chart library); bar colour is
// the primary token. Heights are relative to the largest value; every bar has a text value for
// screen readers and a title for hover.
import type { DayPoint } from '~/types/api'

const props = defineProps<{ points: DayPoint[]; label: string; compact?: boolean }>()
const max = computed(() => Math.max(1, ...props.points.map((p) => Number(p.revenue))))
const short = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const total = computed(() => props.points.reduce((n, p) => n + Number(p.revenue), 0))
</script>

<template>
  <figure :aria-label="label">
    <div class="flex h-40 items-end gap-1" role="img" :aria-label="`${label}: total ${taka(total)}`">
      <div v-for="p in points" :key="p.day" class="flex h-full flex-1 flex-col justify-end" :title="`${short(p.day)}: ${taka(p.revenue)} · ${p.orders} orders`">
        <div class="w-full bg-primary" :style="{ height: `${Math.max(2, (Number(p.revenue) / max) * 100)}%` }" />
      </div>
    </div>
    <figcaption class="mt-1 flex justify-between text-xs text-muted"><span>{{ short(points[0]?.day ?? '') }}</span><span v-if="!compact">{{ points.length }} days</span><span>{{ short(points[points.length - 1]?.day ?? '') }}</span></figcaption>
    <table class="sr-only"><caption>{{ label }}</caption><tbody><tr v-for="p in points" :key="p.day"><td>{{ short(p.day) }}</td><td>{{ taka(p.revenue) }}</td></tr></tbody></table>
  </figure>
</template>
