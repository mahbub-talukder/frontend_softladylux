<script setup lang="ts">
// Design: SizeGuide board. SRS CAT-08: calculator + chart tabs, driven by the admin-managed charts.
// Shared by the /size-guide page and by the product-page dialog (`modal`): the dialog drops the page band and the
// outer container so customers can check their size without leaving the product (CAT-08, STF).
import type { SizeChartData } from '~/types/api'
import { apparelSize, braSize, type ApparelChart, type BraChart } from '~/utils/sizeCalc'

defineProps<{ modal?: boolean }>()
defineEmits<{ shop: [] }>()
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
    <StorePageBand v-if="!modal" eyebrow="Fit guidance" title="Find your size" blurb="Use the calculator for a suggested size, then check it against the chart. All measurements are in centimetres, taken over a thin layer of clothing." />
    <p v-else class="mb-6 text-[15px] text-body">Enter your measurements for a suggested size, then check it against the chart. All measurements are in centimetres, taken over a thin layer of clothing.</p>
    <section :class="modal ? 'flex flex-col gap-8' : 'wrap flex flex-col gap-10 pb-6 pt-10 md:pt-16 lg:flex-row lg:items-start lg:gap-14'">
      <div class="flex min-w-0 flex-1 flex-col gap-[26px] border border-border bg-surface p-6 md:p-10">
        <div><h2 class="font-display text-h2 md:text-h2-lg">Measurement calculator</h2><p class="mt-2 text-[15px] text-body">Enter your measurements in cm.</p></div>
        <div class="grid grid-cols-3 gap-3 md:gap-4">
          <div class="fld"><label class="sf-lbl" for="ub">Under bust</label><input id="ub" v-model.number="ub" type="number" inputmode="numeric" min="60" max="130" class="sf-inp !text-[17px]"></div>
          <div class="fld"><label class="sf-lbl" for="bu">Bust</label><input id="bu" v-model.number="bu" type="number" inputmode="numeric" min="70" max="150" class="sf-inp !text-[17px]"></div>
          <div class="fld"><label class="sf-lbl" for="hp">Hip</label><input id="hp" v-model.number="hp" type="number" inputmode="numeric" min="70" max="160" class="sf-inp !text-[17px]"></div>
        </div>
        <div class="grid border border-ink sm:grid-cols-2" role="status" aria-live="polite">
          <div class="flex flex-col gap-1.5 bg-ink p-6 text-bg md:p-7"><div class="text-xs uppercase tracking-[0.2em] text-champagne">Bra size</div><div class="font-display text-h1-lg leading-none md:text-display-lg">{{ braResult?.label ?? '—' }}</div><div class="text-sm text-text-dark">{{ braResult ? `Band ${braResult.band} · Cup ${braResult.cup}` : 'Bust must be larger than under bust' }}</div></div>
          <div class="flex flex-col gap-1.5 p-6 md:p-7"><div class="eyebrow">Panties, shapewear &amp; tops</div><div class="font-display text-h1-lg leading-none md:text-display-lg">{{ apparelResult }}</div><div class="text-sm text-body">Based on hip {{ hp }} cm</div></div>
        </div>
        <div class="flex flex-wrap gap-3.5"><NuxtLink v-if="braResult" :to="`/shop/bras?size=${braResult.label}`" class="btn" @click="$emit('shop')">Shop in {{ braResult.label }}</NuxtLink><button class="btn-secondary" @click="reset">Reset</button></div>
        <p class="text-[13.5px] leading-relaxed text-muted">Between two sizes? Choose the larger band for comfort, or the smaller band if you prefer a firmer fit.</p>
      </div>
      <div :class="modal ? 'min-w-0' : 'min-w-0 lg:w-[420px] lg:flex-none'">
        <h2 class="mb-5 font-display text-h2 md:text-h2-lg">How to measure</h2>
        <ol><li v-for="(s, i) in steps" :key="s[0]" class="flex gap-5 border-t border-border py-[22px] last:border-b md:gap-[22px]"><span class="w-[46px] flex-none font-display text-h1 leading-none text-gold">{{ i + 1 }}</span><div><div class="sf-lbl mb-1.5">{{ s[0] }}</div><p class="text-[15px] leading-[1.65] text-body">{{ s[1] }}</p></div></li></ol>
      </div>
    </section>

    <section :class="modal ? 'pt-10' : 'wrap pb-16 pt-12 md:pb-24 md:pt-16'">
      <div class="mb-7 flex flex-wrap items-end justify-between gap-5"><h2 class="font-display text-h2 md:text-h2-lg">Size chart</h2>
        <div class="flex w-full border border-ink sm:w-auto" role="tablist"><button v-for="t in ([['bra', 'Bras'], ['apparel', 'Panties, shapewear & tops']] as const)" :key="t[0]" class="h-12 flex-1 px-5 text-xs font-medium uppercase tracking-[0.16em] transition-colors sm:flex-none sm:px-7" :class="tab === t[0] ? 'bg-ink text-bg' : 'hover:bg-cream'" role="tab" :aria-selected="tab === t[0]" @click="tab = t[0]">{{ t[1] }}</button></div></div>
      <div v-if="tab === 'bra' && bra" class="grid gap-6 md:grid-cols-2 md:gap-10">
        <div class="overflow-x-auto"><table class="w-full border border-border bg-surface"><thead><tr><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Band</th><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Under bust (cm)</th></tr></thead><tbody><tr v-for="b in bra.bands" :key="b.size" :class="braResult?.band === b.size ? 'bg-cream' : ''"><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ b.size }}</td><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ b.min }} – {{ b.max }}</td></tr></tbody></table></div>
        <div class="overflow-x-auto"><table class="w-full border border-border bg-surface"><thead><tr><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Cup</th><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Bust minus under bust (cm)</th></tr></thead><tbody><tr v-for="c in bra.cups" :key="c.cup" :class="braResult?.cup === c.cup ? 'bg-cream' : ''"><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ c.cup }}</td><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ c.min }} – {{ c.max }}</td></tr></tbody></table></div>
      </div>
      <div v-if="tab === 'apparel' && apparel" class="overflow-x-auto"><table class="w-full min-w-[480px] border border-border bg-surface"><thead><tr><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Size</th><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Bust (cm)</th><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Waist (cm)</th><th class="border-b border-field bg-cream px-[18px] py-3.5 text-left text-xs font-semibold uppercase tracking-[0.16em]">Hip (cm)</th></tr></thead><tbody><tr v-for="r in apparel.rows" :key="r.size" :class="apparelResult === r.size ? 'bg-cream' : ''"><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ r.size }}</td><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ r.bust.join(' – ') }}</td><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ r.waist.join(' – ') }}</td><td class="border-b border-border px-[18px] py-[15px] text-[15px]">{{ r.hip.join(' – ') }}</td></tr></tbody></table></div>
    </section>
  </div>
</template>
