<script lang="ts">
// Module scope (a plain <script>, not <script setup>, which runs per instance) lives as long as the loaded app in the
// browser and resets on every full page load. Only touched in onMounted, so the server never changes it.
let shownThisLoad = false
</script>

<script setup lang="ts">
// Promotional Ads Panel. SRS WEB-11 (amendment v1.6): Admin → Website content → "Promotional Ads Panel" sets the image,
// heading, text, button and on/off. While it is on, it opens once per application load: shortly after the first home
// page view of a full page load (first visit, reload, or typed URL). Going back to the home page through in-app
// navigation does not open it again. ×, Esc, the backdrop and "Continue browsing" close it until the next full load.
import type { Banner } from '~/types/api'

const props = defineProps<{ popup: Banner }>()
const open = ref(false)
const hasText = computed(() => !!(props.popup.heading || props.popup.text || props.popup.button_label))
const cta = computed(() => props.popup.button_label || 'Shop now')
let timer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (!props.popup.media || shownThisLoad) return
  timer = setTimeout(() => { shownThisLoad = true; open.value = true }, 800)
})
onBeforeUnmount(() => clearTimeout(timer))
const close = () => { open.value = false }
// The image keeps its own proportions (no crop): resize to 800 px wide with the matching height.
const shape = computed(() => {
  const m = props.popup.media
  return m?.width && m?.height ? { ratio: `${m.width}/${m.height}`, height: Math.round((800 * m.height) / m.width) } : { ratio: '1/1', height: 800 }
})
const img = computed(() => ({ format: 'webp', src: mediaSrc(props.popup.media?.url), alt: props.popup.media?.alt_text ?? '', width: 800, height: shape.value.height, sizes: '100vw sm:560px', loading: 'eager' as const }))
</script>

<template>
  <StoreDialog
    v-if="open && popup.media" labelledby="promo-title" overlay-class="items-center p-4 sm:p-6"
    :panel-class="`promo-in relative grid max-h-[92vh] w-full overflow-hidden rounded-[20px] bg-bg shadow-pop ${hasText ? 'max-w-[860px] sm:grid-cols-2' : 'max-w-[560px]'}`"
    @close="close"
  >
    <button type="button" class="absolute right-3 top-3 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur-sm transition-colors hover:bg-primary hover:text-primary-contrast" aria-label="Close offer" data-track="promo_close" @click="close">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </button>

    <!-- Image only: the whole picture is the link (when one is set) -->
    <!-- v1.11 owner request: the picture always fills its box (object-fit: cover), whatever its size, so there are no
         empty bands. Phones with text: a full-width band 42vh tall. Wider screens keep the picture's own proportions. -->
    <NuxtLink v-if="!hasText && popup.link" :to="popup.link" class="flex items-center justify-center bg-tile-2" data-track="promo_cta" @click="close">
      <NuxtImg v-bind="img" class="block h-auto max-h-[85vh] w-full object-cover" :style="{ aspectRatio: shape.ratio }" />
      <h2 id="promo-title" class="sr-only">Special offer</h2>
    </NuxtLink>
    <div v-else class="flex items-center justify-center bg-tile-2">
      <NuxtImg v-bind="img" class="block w-full object-cover" :class="hasText ? 'h-[42vh] sm:h-full sm:max-h-[88vh] sm:min-h-[420px]' : 'h-auto max-h-[85vh] [aspect-ratio:var(--r)]'" :style="{ '--r': shape.ratio }" />
      <h2 v-if="!hasText" id="promo-title" class="sr-only">Special offer</h2>
    </div>

    <div v-if="hasText" class="flex flex-col justify-center gap-4 overflow-y-auto px-6 py-7 text-center sm:px-10 sm:py-12 sm:text-left">
      <h2 id="promo-title" class="text-h2 leading-[1.08] md:text-h2-lg">{{ popup.heading || 'Special offer' }}</h2>
      <p v-if="popup.text" class="whitespace-pre-line text-[15px] leading-[1.7] text-body">{{ popup.text }}</p>
      <div class="mt-2 flex flex-col items-center gap-1 sm:items-start">
        <NuxtLink v-if="popup.link" :to="popup.link" class="btn w-full sm:w-auto" data-autofocus data-track="promo_cta" @click="close">{{ cta }}</NuxtLink>
        <button type="button" class="lnk text-muted" @click="close">Continue browsing</button>
      </div>
    </div>
  </StoreDialog>
</template>
