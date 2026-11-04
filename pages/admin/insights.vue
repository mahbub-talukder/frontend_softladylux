<script setup lang="ts">
// Design: AdminInsights board. SRS INS-01 (most wishlisted products, who saved a product), INS-03/06
// (GA4 for visitors and clicks: a link out; GTM ID lives in Settings -> Analytics). Needs insights.view.
import type { WishlistInsight } from '~/types/api'

definePageMeta({ layout: 'admin', permission: 'insights.view' })
const { api } = useApi()
const { data: site } = await useSiteSettings()
const data = ref<WishlistInsight | null>(null)
const savers = ref<{ product: string; customers: { name: string; phone: string; saved_at: string }[] } | null>(null)
const failed = ref(false)
onMounted(async () => { try { data.value = await api<WishlistInsight>('/admin/insights/wishlist/') } catch { failed.value = true } })
async function who(id: number) { savers.value = await api(`/admin/insights/wishlist/${id}/`) }
</script>

<template>
  <section>
    <AdminHeading eyebrow="Wishlist insights" title="What customers save" />
    <p v-if="failed" class="err" role="alert">Insights could not be loaded.</p>
    <template v-else-if="data">
      <div class="mb-6 grid gap-3 sm:grid-cols-3"><div class="card"><span class="cap">Items saved</span><span class="font-display text-4xl">{{ data.kpis.saves }}</span></div><div class="card"><span class="cap">Customers with a wishlist</span><span class="font-display text-4xl">{{ data.kpis.customers }}</span></div><div class="card"><span class="cap">Products saved</span><span class="font-display text-4xl">{{ data.kpis.products }}</span></div></div>
      <div class="grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div class="card"><h2 class="text-2xl">Most wishlisted products</h2>
          <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="cap"><th class="p-2">Product</th><th class="p-2">Saved by</th><th class="p-2">Bought by savers</th><th class="p-2">Conversion</th><th /></tr></thead>
            <tbody><tr v-for="p in data.products" :key="p.product" class="border-t border-border"><td class="p-2">{{ p.name }}<br><span class="hint">{{ p.category }} · {{ p.units_sold }} units sold</span></td><td class="p-2">{{ p.saved_by }}</td><td class="p-2">{{ p.bought_by_savers }}</td><td class="p-2">{{ p.conversion }}%</td><td class="p-2"><button class="underline" @click="who(p.product)">Who saved it</button></td></tr><tr v-if="!data.products.length"><td colspan="5" class="p-6 text-center text-muted">Nobody has saved a product yet.</td></tr></tbody></table></div>
          <p class="hint">Conversion = share of the customers who saved a product that later bought it.</p></div>
        <div class="flex flex-col gap-6">
          <div v-if="savers" class="card"><h2 class="text-2xl">{{ savers.product }}</h2><ul class="text-sm"><li v-for="c in savers.customers" :key="c.phone" class="flex justify-between border-b border-border py-1"><span>{{ c.name }}</span><span class="hint">{{ c.phone }}</span></li></ul></div>
          <div class="card"><h2 class="text-2xl">Visitors &amp; clicks</h2><p class="text-sm">Page-wise visitors, traffic sources and button-click reports are tracked in Google Analytics 4 through Google Tag Manager.</p><a href="https://analytics.google.com/" target="_blank" rel="noopener" class="btn-secondary self-start" data-track="open_ga4">Open Google Analytics ↗</a><p class="hint">Tracking starts only after the visitor accepts the cookie banner. {{ site?.gtm_id ? `GTM container: ${site.gtm_id}.` : 'No GTM ID is set yet: add it in Settings → Analytics.' }}</p></div>
        </div>
      </div>
    </template>
  </section>
</template>
