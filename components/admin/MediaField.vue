<script setup lang="ts">
// SRS WEB-09: upload JPG/PNG/WebP up to 5 MB, alt text required, recommended size shown.
// UI-06: the file is checked in the browser first (type, size, readable); if the alt text is still empty the chosen file
// is kept and an Upload button appears once the alt text is typed, instead of silently dropping the selection.
import type { Media } from '~/types/api'
import { checkImageFile } from '~/utils/imageCheck'

const props = withDefaults(defineProps<{ modelValue: Media | null; kind: string; label: string; hint: string; required?: boolean; minSide?: number }>(), { required: false, minSide: 0 })
const emit = defineEmits<{ 'update:modelValue': [Media | null] }>()
const { api, errorOf, toast } = useApi()
const alt = ref(props.modelValue?.alt_text ?? '')
const error = ref('')
const busy = ref(false)
const picked = ref<File | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const id = `media-${props.kind}-${props.label.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}`

async function upload() {
  const file = picked.value
  if (!file) return
  if (!alt.value.trim()) { error.value = 'Describe the image in the alt text box, then it uploads (alt text is required).'; return }
  const fd = new FormData()
  fd.append('file', file); fd.append('kind', props.kind); fd.append('alt_text', alt.value.trim())
  busy.value = true; error.value = ''
  try {
    emit('update:modelValue', await api<Media>('/admin/media/', { method: 'POST', body: fd, toast: false, successMessage: `${props.label} uploaded` }))
    picked.value = null
    if (fileInput.value) fileInput.value.value = ''
  } catch (err) {
    const er = errorOf(err)
    error.value = er.flat.join(' ')
    toast.error(`${props.label} was not uploaded`, er.flat.slice(0, 2))
  } finally { busy.value = false }
}

async function onFile(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const bad = await checkImageFile(file, { minSide: props.minSide })
  if (bad) { error.value = bad; picked.value = null; input.value = ''; return }
  picked.value = file; error.value = ''
  await upload()
}
</script>

<template>
  <div class="fld" :data-field="id">
    <label :for="id">{{ label }}
      <span v-if="required" class="text-accent" aria-hidden="true"> *</span><span v-if="required" class="sr-only"> (required)</span>
      <span v-else class="ml-1 text-[11.5px] font-normal normal-case tracking-normal text-muted">(Optional)</span>
    </label>
    <div v-if="modelValue" class="flex items-center gap-3">
      <NuxtImg format="webp" :src="mediaSrc(modelValue.url)" :alt="modelValue.alt_text" width="96" height="64" class="h-16 w-24 border border-border object-cover" />
      <button type="button" class="hint min-h-11 underline" @click="emit('update:modelValue', null)">Remove</button>
    </div>
    <input v-model="alt" class="inp" placeholder="Alt text (describe the image)" maxlength="200" :aria-label="`${label} alt text`" :aria-invalid="!!error && !alt.trim()">
    <input :id="id" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" :disabled="busy" :aria-describedby="`${id}-hint`" @change="onFile">
    <p :id="`${id}-hint`" class="hint">{{ hint }} · JPG, PNG or WebP, max 5 MB. Alt text is required.</p>
    <p v-if="busy" class="hint" role="status">Uploading…</p>
    <div v-if="picked && !busy" class="flex flex-wrap items-center gap-3">
      <span class="hint">{{ picked.name }} is ready.</span>
      <button type="button" class="btn-secondary !h-11" :disabled="!alt.trim()" @click="upload">Upload</button>
      <span v-if="!alt.trim()" class="hint">Type the alt text above first.</span>
    </div>
    <p v-if="error" class="err" role="alert">{{ error }}</p>
  </div>
</template>
