<script setup lang="ts">
// SRS UI-06: accessible label + inline error text for every admin field, with an explicit marker for
// mandatory ("*") and optional ("(Optional)") fields. The control goes in the default slot and receives
// `id`, `invalid` and `describedby` so the label, hint and error are all wired up for screen readers.
const props = withDefaults(defineProps<{
  label: string
  name: string
  /** Mandatory: shows "*". Otherwise the field shows "(Optional)" unless `hideOptional` is set. */
  required?: boolean
  hideOptional?: boolean
  hint?: string
  error?: string
  /** Show "n / max" under the control. */
  counter?: { value: string | null | undefined; max: number }
}>(), { required: false, hideOptional: false, hint: '', error: '', counter: undefined })

const id = `f-${props.name.replace(/[^a-z0-9_-]/gi, '-')}`
const describedby = computed(() => [props.hint ? `${id}-hint` : '', props.error ? `${id}-err` : ''].filter(Boolean).join(' ') || undefined)
const len = computed(() => (props.counter?.value ?? '').length)
</script>

<template>
  <div class="fld" :data-field="name">
    <label :for="id">
      {{ label }}
      <span v-if="required" class="text-accent" aria-hidden="true"> *</span><span v-if="required" class="sr-only"> (required)</span>
      <span v-else-if="!hideOptional" class="ml-1 text-[11.5px] font-normal normal-case tracking-normal text-muted">(Optional)</span>
    </label>
    <slot :id="id" :invalid="!!error" :describedby="describedby" />
    <p v-if="hint" :id="`${id}-hint`" class="hint">{{ hint }}</p>
    <p v-if="counter" class="text-right text-[12px] text-muted" :class="len > counter.max ? '!text-accent' : ''">{{ len }} / {{ counter.max }}</p>
    <p v-if="error" :id="`${id}-err`" class="err" role="alert">{{ error }}</p>
  </div>
</template>
