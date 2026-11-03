<script setup lang="ts">
// Design: AdminTheme board. SRS ADM-11, THM-02/07/08/09/19: palette gallery, custom colours,
// live preview (client-side derivation, server recomputes on save), contrast confirm, reset.
import type { Palette, ThemeState } from '~/types/api'
import { deriveTokens, HEX_RE, lowContrast } from '~/utils/themeDerive'

definePageMeta({ layout: 'admin', permission: 'theme.manage' })
const { api, errorOf } = useApi()
const palettes = ref<Palette[]>([])
const state = ref<ThemeState | null>(null)
const primary = ref('')
const accent = ref('')
const paletteId = ref<number | null>(null)
const error = ref('')
const message = ref('')
const custom = reactive({ name: '', primary: '', accent: '' })

async function load() {
  const [p, t] = await Promise.all([api<Palette[]>('/admin/theme/palettes/'), api<ThemeState>('/admin/theme/')])
  palettes.value = p; state.value = t
  primary.value = t.primary_hex; accent.value = t.accent_hex ?? ''; paletteId.value = t.palette
}
await load()

const valid = computed(() => HEX_RE.test(primary.value) && (!accent.value || HEX_RE.test(accent.value)))
const preview = computed(() => (valid.value ? deriveTokens(primary.value, accent.value || null) : {}))
const warn = computed(() => valid.value && lowContrast(primary.value))
const customs = computed(() => palettes.value.filter((p) => !p.is_builtin))

function pick(p: Palette) { paletteId.value = p.id; primary.value = p.primary_hex; accent.value = p.accent_hex }
function edited() { paletteId.value = null } // typing a hex makes it a custom colour (THM-02)

async function publish() {
  error.value = ''; message.value = ''
  if (warn.value && !confirm('This primary colour has low contrast on the page background. Links, borders and focus rings may be hard to see. Publish anyway?')) return
  try {
    await api('/admin/theme/', { method: 'PUT', body: { palette: paletteId.value, primary_hex: primary.value, accent_hex: accent.value || null, confirm_low_contrast: warn.value } })
    message.value = 'Published. The website now uses this theme.'; await load(); await refreshNuxtData()
  } catch (e) { error.value = errorOf(e).message }
}
async function reset() {
  if (!confirm('Reset to the default Signature palette?')) return // ADM-08
  await api('/admin/theme/reset/', { method: 'POST' }); message.value = 'Reset to Signature.'; await load()
}
async function addCustom() {
  error.value = ''
  try {
    await api('/admin/theme/palettes/', { method: 'POST', body: { name: custom.name, primary_hex: custom.primary, accent_hex: custom.accent } })
    Object.assign(custom, { name: '', primary: '', accent: '' }); await load()
  } catch (e) { const er = errorOf(e); error.value = Object.values(er.fields).flat().join(' ') || er.message }
}
async function removeCustom(p: Palette) {
  if (!confirm(`Delete "${p.name}"?`)) return
  await api(`/admin/theme/palettes/${p.id}/`, { method: 'DELETE' }); await load()
}
const swatch = (hex: string) => ({ backgroundColor: hex }) // data from the API, not a literal
</script>

<template>
  <section>
    <AdminHeading eyebrow="Theme" title="Theme colours" />
    <div class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="card">
        <h2 class="text-2xl">Palette gallery</h2>
        <p class="hint">Pick one. The whole storefront and admin follow the primary and accent colours.</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button v-for="p in palettes" :key="p.id" type="button" class="flex flex-col gap-2 border p-2.5 text-left" :class="paletteId === p.id ? 'border-2 border-primary' : 'border-border'" :aria-pressed="paletteId === p.id" @click="pick(p)">
            <span class="flex h-10"><span class="flex-1" :style="swatch(p.primary_hex)" /><span class="flex-1" :style="swatch(p.accent_hex)" /></span>
            <span class="text-sm">{{ p.name }}</span>
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <div class="fld"><label for="pri">Primary colour</label>
            <div class="flex gap-2"><input id="pri" v-model="primary" class="inp" placeholder="#RRGGBB" @input="edited"><input v-model="primary" type="color" aria-label="Primary colour picker" class="h-[46px] w-14 border border-border" @input="edited"></div></div>
          <div class="fld"><label for="acc">Accent colour (optional)</label>
            <div class="flex gap-2"><input id="acc" v-model="accent" class="inp" placeholder="#RRGGBB" @input="edited"><input v-model="accent" type="color" aria-label="Accent colour picker" class="h-[46px] w-14 border border-border" @input="edited"></div></div>
        </div>
        <p v-if="warn" class="err" role="alert">Low contrast: this primary has less than 3:1 contrast on the page background. You will be asked to confirm before publishing. Text on buttons is switched automatically.</p>
        <h3 class="text-xl">Custom palettes <span class="hint">(up to 5)</span></h3>
        <ul class="flex flex-col gap-2">
          <li v-for="p in customs" :key="p.id" class="flex items-center gap-3">
            <button class="flex flex-1 items-center gap-3 border border-border p-2 text-left" @click="pick(p)"><span class="flex h-6 w-12"><span class="flex-1" :style="swatch(p.primary_hex)" /><span class="flex-1" :style="swatch(p.accent_hex)" /></span>{{ p.name }}</button>
            <button class="hint underline" :aria-label="`Delete ${p.name}`" @click="removeCustom(p)">Delete</button>
          </li>
        </ul>
        <div class="grid items-end gap-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
          <div class="fld"><label for="cn">Name</label><input id="cn" v-model="custom.name" class="inp" placeholder="My palette"></div>
          <div class="fld"><label for="c1">Primary</label><input id="c1" v-model="custom.primary" class="inp" placeholder="#RRGGBB"></div>
          <div class="fld"><label for="c2">Accent</label><input id="c2" v-model="custom.accent" class="inp" placeholder="#RRGGBB"></div>
          <button class="btn-secondary" @click="addCustom">Add</button>
        </div>
      </div>
      <div class="card">
        <h2 class="text-2xl">Live preview</h2>
        <!-- Tokens are scoped to this panel only; nothing goes live until Save & publish. -->
        <div class="flex flex-col gap-4 border-t-[6px] border-accent bg-bg p-6" :style="preview">
          <div class="font-display text-2xl text-primary">Quiet luxury, worn close</div>
          <a href="#preview" class="text-primary underline" @click.prevent>Preview of a link</a>
          <div class="flex flex-wrap items-center gap-3">
            <span class="btn">Shop now</span><span class="btn-secondary">Details</span>
            <span class="bg-accent px-2.5 py-1 text-[13px] font-semibold text-primary-contrast">−20%</span>
          </div>
          <div class="border border-border bg-surface p-3 text-sm"><span class="bg-primary-soft px-2 py-1 text-primary">Active navigation</span></div>
          <input class="inp focus:outline focus:outline-2 focus:outline-primary" placeholder="Form field with focus ring" aria-label="Preview field">
        </div>
        <div class="flex flex-wrap gap-3">
          <button class="btn" :disabled="!valid" data-track="theme_publish" @click="publish">Save &amp; publish</button>
          <button class="btn-secondary" @click="reset">Reset to Signature</button>
        </div>
        <p class="hint">Last changed by {{ state?.updated_by || '—' }}<template v-if="state"> · {{ new Date(state.updated_at).toLocaleString() }}</template>. Changes show on the storefront within a minute.</p>
        <p v-if="message" class="hint" role="status">{{ message }}</p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
      </div>
    </div>
  </section>
</template>
