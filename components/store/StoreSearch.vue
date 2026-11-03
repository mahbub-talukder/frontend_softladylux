<script setup lang="ts">
// SRS CAT-10 / STF header: search with a suggestions dropdown (top 6, image + price).
import type { CardProduct } from '~/types/api'

const { api } = useApi()
const router = useRouter()
const q = ref('')
const hits = ref<Pick<CardProduct, 'name' | 'slug' | 'price' | 'image'>[]>([])
const open = ref(false)
let timer: ReturnType<typeof setTimeout> | undefined

watch(q, (v) => {
  clearTimeout(timer)
  if (v.trim().length < 2) { hits.value = []; return }
  timer = setTimeout(async () => {
    try { hits.value = await api('/search/suggest/', { query: { q: v.trim() } }) } catch { hits.value = [] }
  }, 200)
})
function submit() {
  open.value = false
  if (q.value.trim()) router.push({ path: '/search', query: { q: q.value.trim() } })
}
</script>

<template>
  <form class="relative w-full max-w-md" role="search" @submit.prevent="submit" @focusin="open = true" @focusout="open = false">
    <label for="hdr-search" class="sr-only">Search products</label>
    <input id="hdr-search" v-model="q" type="search" autocomplete="off" placeholder="Search bras, sets, sleepwear…" class="inp">
    <ul v-if="open && hits.length" class="absolute left-0 right-0 top-full z-20 border border-border bg-surface shadow-sm">
      <li v-for="h in hits" :key="h.slug">
        <NuxtLink :to="`/product/${h.slug}`" class="flex items-center gap-3 p-2 hover:bg-primary-soft" @mousedown.prevent="router.push(`/product/${h.slug}`)">
          <NuxtImg format="webp" v-if="h.image" :src="mediaSrc(h.image.url)" :alt="h.name" width="40" height="52" class="h-[52px] w-10 object-cover" />
          <span class="flex-1 text-sm">{{ h.name }}</span><span class="text-sm">{{ taka(h.price) }}</span>
        </NuxtLink>
      </li>
    </ul>
  </form>
</template>
