<script setup lang="ts">
// Design: AdminDashboard / AdminReports bar charts. Plain CSS bars (no chart library); bar colour is
// the primary token. Heights are relative to the largest value; every bar has a text value for
// screen readers and a title for hover.
import type { DayPoint } from '~/types/api'

const props = defineProps<{ points: DayPoint[]; label: string; compact?: boolean; tall?: boolean }>()
const max = computed(() => Math.max(1, ...props.points.map((p) => Number(p.revenue))))
const day = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' })
const thousands = (v: string) => { const n = Number(v) / 1000; return n === 0 ? '0' : n >= 10 ? String(Math.round(n)) : n.toFixed(1).replace(/\.0$/, '') }
const short = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const total = computed(() => props.points.reduce((n, p) => n + Number(p.revenue), 0))
</script>

<template>
  <figure v-if="tall" :aria-label="label" class="flex flex-col gap-1.5">
    <div class="flex h-[240px] items-end border-b border-field pt-2.5" :class="points.length > 14 ? 'gap-1 sm:gap-1.5' : 'gap-3 sm:gap-[18px]'" role="img" :aria-label="`${label}: total ${taka(total)}`">
      <div v-for="(p, i) in points" :key="p.day" class="flex h-full flex-1 flex-col items-center justify-end gap-1.5" :title="`${short(p.day)}: ${taka(p.revenue)} · ${p.orders} orders`">
        <span v-if="points.length <= 14" class="text-[13px] text-body">{{ thousands(p.revenue) }}</span>
        <div class="w-full max-w-14 transition-[height] duration-500"  :class="i === points.length - 1 ? 'bg-accent' : 'bg-champagne'" :style="{ height: `${Math.max(2, (Number(p.revenue) / max) * 190)}px` }" />
      </div>
    </div>
    <div v-if="points.length <= 14" class="flex gap-3 sm:gap-[18px]"><span v-for="p in points" :key="p.day" class="flex-1 text-center text-[12.5px] text-muted">{{ day(p.day) }}</span></div>
    <div v-else class="flex justify-between text-[12.5px] text-muted"><span>{{ short(points[0]?.day ?? '') }}</span><span>{{ short(points[Math.floor(points.length / 2)]?.day ?? '') }}</span><span>{{ short(points[points.length - 1]?.day ?? '') }}</span></div>
    <table class="sr-only"><caption>{{ label }}</caption><tbody><tr v-for="p in points" :key="p.day"><td>{{ short(p.day) }}</td><td>{{ taka(p.revenue) }}</td></tr></tbody></table>
  </figure>
  <figure v-else :aria-label="label">
    <div class="flex h-40 items-end gap-1" role="img" :aria-label="`${label}: total ${taka(total)}`">
      <div v-for="p in points" :key="p.day" class="flex h-full flex-1 flex-col justify-end" :title="`${short(p.day)}: ${taka(p.revenue)} · ${p.orders} orders`">
        <div class="w-full bg-primary" :style="{ height: `${Math.max(2, (Number(p.revenue) / max) * 100)}%` }" />
      </div>
    </div>
    <figcaption class="mt-1 flex justify-between text-xs text-muted"><span>{{ short(points[0]?.day ?? '') }}</span><span v-if="!compact">{{ points.length }} days</span><span>{{ short(points[points.length - 1]?.day ?? '') }}</span></figcaption>
    <table class="sr-only"><caption>{{ label }}</caption><tbody><tr v-for="p in points" :key="p.day"><td>{{ short(p.day) }}</td><td>{{ taka(p.revenue) }}</td></tr></tbody></table>
  </figure>
</template>
