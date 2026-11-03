<script setup lang="ts">
// Design: SizeGuide board. SRS CAT-08: calculator + chart tabs, driven by the admin-managed charts.
import type { SizeChartData } from '~/types/api'
import { apparelSize, braSize, type ApparelChart, type BraChart } from '~/utils/sizeCalc'

useSeoMeta({ title: 'Size guide' })
const { api } = useApi()
const { data: charts } = await useAsyncData('size-charts', () => api<SizeChartData[]>('/size-charts/'))
const bra = computed(() => charts.value?.find((c) => c.type === 'bra')?.rows as BraChart | undefined)
const apparel = computed(() => charts.value?.find((c) => c.type === 'apparel')?.rows as ApparelChart | undefined)
const ub = ref(80)
const bu = ref(94)
const hp = ref(98)
const tab = ref<'bra' | 'apparel'>('bra')
const braResult = computed(() => (bra.value ? braSize(bra.value, ub.value, bu.value) : null))
const apparelResult = computed(() => (apparel.value ? apparelSize(apparel.value, hp.value) : '—'))
const steps = [
  ['Under bust', 'Wrap the tape firmly around your ribcage directly under the bust. Keep it level and snug, not tight.'],
  ['Bust', 'Measure around the fullest part of your bust with the tape parallel to the floor.'],
  ['Hip', 'Measure around the widest part of your hips and seat, feet together.']
]
const reset = () => { ub.value = 80; bu.value = 94; hp.value = 98 }
</script>

<template>
  <div>
    <div class="cap">Fit guidance</div>
    <h1 class="text-4xl">Find your size</h1>
    <p class="mt-2 max-w-2xl text-muted">Use the calculator for a suggested size, then check it against the chart. All measurements are in centimetres, taken over a thin layer of clothing.</p>
    <div class="mt-8 grid gap-8 lg:grid-cols-2">
      <div class="card">
        <h2 class="text-2xl">Measurement calculator</h2>
        <div class="fld"><label for="ub">Under bust</label><input id="ub" v-model.number="ub" type="number" min="60" max="130" class="inp"></div>
        <div class="fld"><label for="bu">Bust</label><input id="bu" v-model.number="bu" type="number" min="70" max="150" class="inp"></div>
        <div class="fld"><label for="hp">Hip</label><input id="hp" v-model.number="hp" type="number" min="70" max="160" class="inp"></div>
        <div class="grid grid-cols-2 gap-4" role="status">
          <div><div class="cap">Bra size</div><div class="font-display text-4xl">{{ braResult?.label ?? '—' }}</div><p class="hint">{{ braResult ? `Band ${braResult.band} · Cup ${braResult.cup}` : 'Bust must be larger than under bust' }}</p></div>
          <div><div class="cap">Panties, shapewear &amp; tops</div><div class="font-display text-4xl">{{ apparelResult }}</div><p class="hint">Based on hip {{ hp }} cm</p></div>
        </div>
        <p class="hint">Between two sizes? Choose the larger band for comfort, or the smaller band if you prefer a firmer fit.</p>
        <div class="flex gap-3"><NuxtLink v-if="braResult" :to="`/shop/bras?size=${braResult.label}`" class="btn">Shop in {{ braResult.label }}</NuxtLink><button class="btn-secondary" @click="reset">Reset</button></div>
      </div>
      <div class="card">
        <h2 class="text-2xl">How to measure</h2>
        <ol class="flex flex-col gap-4"><li v-for="(s, i) in steps" :key="s[0]" class="flex gap-3"><span class="flex h-8 w-8 shrink-0 items-center justify-center bg-primary text-primary-contrast">{{ i + 1 }}</span><div><b>{{ s[0] }}</b><p class="hint">{{ s[1] }}</p></div></li></ol>
      </div>
    </div>
    <section class="mt-10">
      <h2 class="mb-3 text-3xl">Size chart</h2>
      <div class="flex border-b border-border"><button class="tab" :aria-pressed="tab === 'bra'" @click="tab = 'bra'">Bras</button><button class="tab" :aria-pressed="tab === 'apparel'" @click="tab = 'apparel'">Panties, shapewear &amp; tops</button></div>
      <div v-if="tab === 'bra' && bra" class="mt-4 grid gap-6 md:grid-cols-2">
        <table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-3">Band</th><th class="p-3">Under bust (cm)</th></tr></thead><tbody><tr v-for="b in bra.bands" :key="b.size" class="border-t border-border" :class="braResult?.band === b.size ? 'bg-primary-soft' : ''"><td class="p-3">{{ b.size }}</td><td class="p-3">{{ b.min }} – {{ b.max }}</td></tr></tbody></table>
        <table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-3">Cup</th><th class="p-3">Bust minus under bust (cm)</th></tr></thead><tbody><tr v-for="c in bra.cups" :key="c.cup" class="border-t border-border" :class="braResult?.cup === c.cup ? 'bg-primary-soft' : ''"><td class="p-3">{{ c.cup }}</td><td class="p-3">{{ c.min }} – {{ c.max }}</td></tr></tbody></table>
      </div>
      <table v-if="tab === 'apparel' && apparel" class="mt-4 w-full text-left text-sm"><thead><tr class="cap"><th class="p-3">Size</th><th class="p-3">Bust (cm)</th><th class="p-3">Waist (cm)</th><th class="p-3">Hip (cm)</th></tr></thead><tbody><tr v-for="r in apparel.rows" :key="r.size" class="border-t border-border" :class="apparelResult === r.size ? 'bg-primary-soft' : ''"><td class="p-3">{{ r.size }}</td><td class="p-3">{{ r.bust.join(' – ') }}</td><td class="p-3">{{ r.waist.join(' – ') }}</td><td class="p-3">{{ r.hip.join(' – ') }}</td></tr></tbody></table>
    </section>
  </div>
</template>
