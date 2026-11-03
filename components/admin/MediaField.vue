<script setup lang="ts">
// SRS WEB-09: upload JPG/PNG/WebP up to 5 MB, alt text required, recommended size shown.
import type { Media } from '~/types/api'

const props = defineProps<{ modelValue: Media | null; kind: string; label: string; hint: string }>()
const emit = defineEmits<{ 'update:modelValue': [Media | null] }>()
const { api, errorOf } = useApi()
const alt = ref(props.modelValue?.alt_text ?? '')
const error = ref('')
const busy = ref(false)

async function onFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (!alt.value.trim()) { error.value = 'Describe the image first (alt text is required).'; return }
  const fd = new FormData()
  fd.append('file', file); fd.append('kind', props.kind); fd.append('alt_text', alt.value.trim())
  busy.value = true; error.value = ''
  try {
    emit('update:modelValue', await api<Media>('/admin/media/', { method: 'POST', body: fd }))
  } catch (err) {
    const er = errorOf(err)
    error.value = Object.values(er.fields).flat().join(' ') || er.message
  } finally { busy.value = false }
}
</script>

<template>
  <div class="fld">
    <label>{{ label }}</label>
    <div v-if="modelValue" class="flex items-center gap-3">
      <NuxtImg format="webp" :src="mediaSrc(modelValue.url)" :alt="modelValue.alt_text" width="96" height="64" class="h-16 w-24 border border-border object-cover" />
      <button type="button" class="hint underline" @click="emit('update:modelValue', null)">Remove</button>
    </div>
    <input v-model="alt" class="inp" placeholder="Alt text (describe the image)" :aria-label="`${label} alt text`">
    <input type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" :aria-label="`${label} file`" @change="onFile">
    <p class="hint">{{ hint }} · JPG, PNG or WebP, max 5 MB.</p>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
  </div>
</template>
