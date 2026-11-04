<script setup lang="ts">
// Design: Listing board. SRS CAT-09 (filters, sort, "Showing X of Y", Load more, URL state),
// CAT-13, CAT-20 (Sub-category group REPLACES the Category group on a category page), UI-03.
import type { CardProduct, ProductPage } from '~/types/api'
import { chips, emptyFilters, parseQuery, toApiParams, toggleIn, toQuery, type Filters } from '~/utils/listingQuery'

const props = defineProps<{
  scope: { category?: string; offers?: boolean; new?: boolean }
  title: string
  blurb?: string
  crumbs?: { name: string; to?: string }[]
}>()
const route = useRoute()
const router = useRouter()
const { api } = useApi()
const PAGE = 12

const filters = computed(() => parseQuery(route.query as Record<string, string | string[]>))
const { data, pending, error, refresh } = await useAsyncData(
  `listing-${JSON.stringify(props.scope)}`,
  () => api<ProductPage>('/products/', { query: toApiParams(filters.value, props.scope, 1, PAGE) }),
  { watch: [() => route.query] }
)
const extra = ref<CardProduct[]>([])
const page = ref(1)
const loadingMore = ref(false)
watch(data, () => { extra.value = []; page.value = 1 })
const items = computed(() => [...(data.value?.results ?? []), ...extra.value])
const total = computed(() => data.value?.count ?? 0)
const facets = computed(() => data.value?.facets)
const showSubs = computed(() => !!props.scope.category && (facets.value?.subcategories.length ?? 0) > 0)
const showCats = computed(() => !props.scope.category && (facets.value?.categories.length ?? 0) > 1)
const drawer = ref(false)

async function more() {
  loadingMore.value = true
  try {
    const next = await api<ProductPage>('/products/', { query: toApiParams(filters.value, props.scope, page.value + 1, PAGE) })
    extra.value.push(...next.results); page.value += 1
  } finally { loadingMore.value = false }
}
function update(patch: Partial<Filters>) { router.push({ query: toQuery({ ...filters.value, ...patch }) }) }
function remove(group: keyof Filters, value: string) {
  const f = filters.value
  if (group === 'priceMax') return update({ priceMax: null })
  if (group === 'available') return update({ available: false })
  update({ [group]: (f[group] as string[]).filter((x) => x !== value) } as Partial<Filters>)
}
const clearAll = () => router.push({ query: toQuery({ ...emptyFilters(), q: filters.value.q, sort: filters.value.sort }) })
const priceMax = computed(() => Math.ceil(Number(facets.value?.price.max ?? 0)))
const priceMin = computed(() => Math.floor(Number(facets.value?.price.min ?? 0)))
const chipList = computed(() => chips(filters.value))
// INS-05: view_item_list (and search on /search) once results are in
const { push, item } = useTrack()
watch(() => data.value?.results, (r) => {
  if (!r || import.meta.server) return
  push('view_item_list', { item_list_name: props.title, items: r.slice(0, 20).map((p) => item(p)) })
  if (route.path === '/search' && filters.value.q) push('search', { search_term: filters.value.q, results: data.value?.count })
}, { immediate: true })
</script>

<template>
  <section>
    <nav v-if="crumbs" class="text-sm text-muted" aria-label="Breadcrumb">
      <template v-for="(c, i) in crumbs" :key="c.name"><NuxtLink v-if="c.to" :to="c.to">{{ c.name }}</NuxtLink><span v-else>{{ c.name }}</span><span v-if="i < crumbs.length - 1"> / </span></template>
    </nav>
    <h1 class="mt-2 text-4xl">{{ title }}</h1>
    <p v-if="blurb" class="mt-1 text-muted">{{ blurb }}</p>

    <div class="mt-6 grid gap-8 lg:grid-cols-[250px_1fr]">
      <button class="btn-secondary lg:hidden" @click="drawer = true">Filters</button>
      <aside :class="drawer ? 'fixed inset-0 z-30 overflow-y-auto bg-bg p-6' : 'hidden lg:block'" aria-label="Filters">
        <div class="flex items-center justify-between">
          <h2 class="text-2xl">Filters</h2>
          <button class="hint underline" @click="clearAll">Clear all</button>
        </div>
        <fieldset v-if="showSubs" class="mt-4">
          <legend class="cap">Sub-category</legend>
          <label v-for="s in facets!.subcategories" :key="s.slug" class="flex min-h-touch items-center gap-2 text-sm">
            <input type="checkbox" :checked="filters.sub.includes(s.slug)" @change="update({ sub: toggleIn(filters.sub, s.slug) })">
            <span class="flex-1">{{ s.name }}</span><span class="text-muted">{{ s.count }}</span>
          </label>
        </fieldset>
        <fieldset v-else-if="showCats" class="mt-4">
          <legend class="cap">Category</legend>
          <label v-for="c in facets!.categories" :key="c.slug" class="flex min-h-touch items-center gap-2 text-sm">
            <input type="checkbox" :checked="filters.category.includes(c.slug)" @change="update({ category: toggleIn(filters.category, c.slug) })">
            <span class="flex-1">{{ c.name }}</span><span class="text-muted">{{ c.count }}</span>
          </label>
        </fieldset>
        <fieldset v-if="facets?.sizes.length" class="mt-4">
          <legend class="cap">Size</legend>
          <div class="mt-1 flex flex-wrap gap-2">
            <button v-for="z in facets.sizes" :key="z" type="button" class="min-h-touch min-w-touch border px-2 text-sm" :class="filters.size.includes(z) ? 'border-primary bg-primary text-primary-contrast' : 'border-border'" :aria-pressed="filters.size.includes(z)" @click="update({ size: toggleIn(filters.size, z) })">{{ z }}</button>
          </div>
        </fieldset>
        <fieldset v-if="facets?.colours.length" class="mt-4">
          <legend class="cap">Colour</legend>
          <div class="mt-1 flex flex-wrap gap-2">
            <button v-for="c in facets.colours" :key="c.name" type="button" :title="c.name" :aria-label="c.name" class="h-8 w-8 border-2" :class="filters.colour.includes(c.name) ? 'border-primary' : 'border-border'" :style="{ backgroundColor: c.hex }" :aria-pressed="filters.colour.includes(c.name)" @click="update({ colour: toggleIn(filters.colour, c.name) })" />
          </div>
        </fieldset>
        <fieldset v-if="facets?.collections.length" class="mt-4">
          <legend class="cap">Collection</legend>
          <label v-for="c in facets.collections" :key="c" class="flex min-h-touch items-center gap-2 text-sm">
            <input type="checkbox" :checked="filters.collection.includes(c)" @change="update({ collection: toggleIn(filters.collection, c) })">{{ c }}
          </label>
        </fieldset>
        <div v-if="priceMax > priceMin" class="mt-4">
          <label for="pr" class="cap">Price up to</label>
          <input id="pr" type="range" class="mt-2 w-full" :min="priceMin" :max="priceMax" :value="filters.priceMax ?? priceMax" @change="update({ priceMax: Number(($event.target as HTMLInputElement).value) >= priceMax ? null : Number(($event.target as HTMLInputElement).value) })">
          <div class="flex justify-between text-sm"><span>{{ taka(priceMin) }}</span><b>{{ taka(filters.priceMax ?? priceMax) }}</b></div>
        </div>
        <label class="mt-4 flex min-h-touch items-center gap-2 text-sm"><input type="checkbox" :checked="filters.available" @change="update({ available: !filters.available })">In stock only</label>
        <button class="btn mt-6 w-full lg:hidden" @click="drawer = false">Show {{ total }} products</button>
      </aside>

      <div>
        <div class="flex flex-wrap items-center justify-between gap-3">
          <p><b>{{ total }}</b> products</p>
          <label class="flex items-center gap-2 text-sm">Sort by
            <select class="inp !h-10 !w-auto" :value="filters.sort" @change="update({ sort: ($event.target as HTMLSelectElement).value as Filters['sort'] })">
              <option value="featured">Featured</option><option value="newest">Newest</option>
              <option value="price_asc">Price: low to high</option><option value="price_desc">Price: high to low</option>
            </select>
          </label>
        </div>
        <div class="mt-3 flex flex-wrap gap-2" aria-label="Active filters">
          <button v-for="c in chipList" :key="c.group + c.value" class="border border-border bg-surface px-3 py-1 text-sm" @click="remove(c.group, c.value)">{{ c.label }} ×</button>
        </div>

        <p v-if="error" class="err mt-6" role="alert">We couldn’t load products. <button class="underline" @click="() => refresh()">Try again</button></p>
        <div v-else-if="pending && !items.length" class="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3" aria-busy="true"><div v-for="n in 6" :key="n" class="aspect-[3/4] animate-pulse bg-cream" /></div>
        <div v-else-if="!items.length" class="mt-10 text-center">
          <h3 class="text-2xl">Nothing matches these filters</h3><p class="hint">Try removing a size or colour.</p>
          <button class="btn-secondary mt-4" @click="clearAll">Clear all filters</button>
        </div>
        <div v-else class="mt-6 grid grid-cols-2 gap-x-4 gap-y-8 md:grid-cols-3">
          <StoreProductCard v-for="p in items" :key="p.id" :product="p" />
        </div>
        <div v-if="items.length" class="mt-10 flex flex-col items-center gap-3">
          <p class="hint">Showing {{ items.length }} of {{ total }}</p>
          <button v-if="items.length < total" class="btn-secondary" :disabled="loadingMore" data-track="load_more" @click="more">Load more</button>
        </div>
      </div>
    </div>
  </section>
</template>
