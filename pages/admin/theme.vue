<script setup lang="ts">
// Design: AdminTheme board. SRS ADM-11, THM-02/07/08/09/19: palette gallery, custom colours,
// live preview (client-side derivation, server recomputes on save), contrast confirm, reset.
// Owner-approved amendment: the storefront Background and Text colours are editable too. Every other neutral is derived
// from them (THM-14), the admin keeps its own neutrals, and primary/accent still style both.
import type { Palette, ThemeState } from '~/types/api'
import { contrastHex, DEFAULT_BG, DEFAULT_TEXT, deriveTokens, readabilityIssues } from '~/utils/themeDerive'

definePageMeta({ layout: 'admin', permission: 'theme.manage' })
const { api, errorOf, toast } = useApi()
const theme = useTheme()
const palettes = ref<Palette[]>([])
const state = ref<ThemeState | null>(null)
const form = reactive({ primary: '', accent: '', background: DEFAULT_BG, text: DEFAULT_TEXT })
const paletteId = ref<number | null>(null)
const error = ref('')
const busy = ref(false)
const customName = ref('')

const { required, hex, maxLength } = rules
const v = useFormValidation(() => form, {
  primary: [required('Choose the primary colour.'), hex()],
  accent: [hex()],
  background: [required('Choose the background colour.'), hex()],
  text: [required('Choose the text colour.'), hex()]
})
const nameCheck = useFormValidation(() => ({ name: customName.value }), { name: [required('Name the palette.'), maxLength(40)] })

async function load() {
  const [p, t] = await Promise.all([api<Palette[]>('/admin/theme/palettes/'), api<ThemeState>('/admin/theme/')])
  palettes.value = p; state.value = t
  Object.assign(form, { primary: t.primary_hex, accent: t.accent_hex ?? '', background: t.background_hex, text: t.text_hex })
  paletteId.value = t.palette
}
await load()

const valid = computed(() => /^#[0-9A-Fa-f]{6}$/.test(form.primary) && /^#[0-9A-Fa-f]{6}$/.test(form.background) && /^#[0-9A-Fa-f]{6}$/.test(form.text) && (!form.accent || /^#[0-9A-Fa-f]{6}$/.test(form.accent)))
const preview = computed(() => (valid.value ? deriveTokens(form.primary, form.accent || null, form.background, form.text) : {}))
const issues = computed(() => (valid.value ? readabilityIssues(form.primary, form.background, form.text) : []))
const ratios = computed(() => (valid.value
  ? [
      { key: 'text_on_background', label: 'Text on background', value: contrastHex(form.text, form.background), need: 4.5 },
      { key: 'primary_on_background', label: 'Primary on background', value: contrastHex(form.primary, form.background), need: 3 }
    ]
  : []))
const customs = computed(() => palettes.value.filter((p) => !p.is_builtin))

function pick(p: Palette) {
  paletteId.value = p.id
  Object.assign(form, { primary: p.primary_hex, accent: p.accent_hex, background: p.background_hex, text: p.text_hex })
  v.reset()
}
function edited(k: string) { paletteId.value = null; v.onInput(k) } // typing a hex makes it a custom colour (THM-02)
const MESSAGES: Record<string, string> = {
  primary_on_background: 'The primary colour has low contrast on the background: links, borders and focus rings may be hard to see.',
  text_on_background: 'The text colour is hard to read on the background.'
}

async function publish() {
  error.value = ''
  if (!v.validateAll()) { toast.error('Please fix the highlighted colours', v.summary.value.slice(0, 3)); return }
  const confirmed = issues.value.length > 0
  if (confirmed && !confirm(`${issues.value.map((i) => MESSAGES[i]).join('\n')}\n\nPublish anyway?`)) return
  busy.value = true
  try {
    const res = await api<ThemeState>('/admin/theme/', {
      method: 'PUT', successMessage: 'Published. The website now uses this theme.',
      body: { palette: paletteId.value, primary_hex: form.primary, accent_hex: form.accent || null, background_hex: form.background, text_hex: form.text, confirm_low_contrast: confirmed }
    })
    theme.apply(res.tokens) // live at once, no reload (SRS THM-08)
    await load()
  } catch (e) { const er = errorOf(e); error.value = er.message; v.setServerErrors(er) } finally { busy.value = false }
}
async function reset() {
  if (!confirm('Reset to the default Signature palette?')) return // ADM-08
  busy.value = true
  try {
    const res = await api<ThemeState>('/admin/theme/reset/', { method: 'POST', successMessage: 'Reset to Signature.' })
    theme.apply(res.tokens)
    await load()
  } catch { /* toast shown by api() */ } finally { busy.value = false }
}
async function addCustom() {
  error.value = ''
  if (!nameCheck.validateAll()) return
  if (!v.validateAll()) { toast.error('Fix the colours first', v.summary.value.slice(0, 3)); return }
  try {
    await api('/admin/theme/palettes/', { method: 'POST', successMessage: `Saved "${customName.value.trim()}" to your palettes`, body: { name: customName.value.trim(), primary_hex: form.primary, accent_hex: form.accent || form.primary, background_hex: form.background, text_hex: form.text } })
    customName.value = ''; nameCheck.reset(); await load()
  } catch (e) { const er = errorOf(e); error.value = er.flat.join(' ') }
}
async function removeCustom(p: Palette) {
  if (!confirm(`Delete "${p.name}"?`)) return
  try { await api(`/admin/theme/palettes/${p.id}/`, { method: 'DELETE', successMessage: `Deleted "${p.name}"` }); await load() } catch { /* toast shown by api() */ }
}
const swatch = (hexColour: string) => ({ backgroundColor: hexColour }) // data from the API, not a literal
const pageStyle = (p: Palette) => ({ backgroundColor: p.background_hex, color: p.text_hex }) // palette data, not literals
const fmt = (n: number) => `${n.toFixed(1)}:1`
</script>

<template>
  <section>
    <AdminHeading eyebrow="Theme" title="Theme colours" />
    <p class="hint mb-3"><span class="text-accent" aria-hidden="true">*</span> marks mandatory fields. Everything else is optional.</p>
    <div class="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
      <div class="card">
        <h2 class="text-2xl">Palette gallery</h2>
        <p class="hint">Pick one, or set your own colours below. Primary and accent colour the buttons, links and highlights; background and text set the look of the whole storefront page. The admin portal keeps its own neutral colours.</p>
        <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <button v-for="p in palettes" :key="p.id" type="button" class="flex flex-col gap-2 border p-2.5 text-left" :class="paletteId === p.id ? 'border-2 border-primary' : 'border-border'" :aria-pressed="paletteId === p.id" @click="pick(p)">
            <span class="flex h-10"><span class="flex-1" :style="swatch(p.primary_hex)" /><span class="flex-1" :style="swatch(p.accent_hex)" /><span class="flex flex-1 items-center justify-center text-[13px] font-semibold" :style="pageStyle(p)" aria-hidden="true">Aa</span></span>
            <span class="text-sm">{{ p.name }}</span>
          </button>
        </div>
        <div class="grid gap-3 sm:grid-cols-2">
          <AdminFormField name="primary" label="Primary colour" required :error="v.errorFor('primary')">
            <template #default="s"><div class="flex gap-2"><input :id="s.id" v-model="form.primary" class="inp" placeholder="#RRGGBB" maxlength="7" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="edited('primary')" @blur="v.touch('primary')"><input v-model="form.primary" type="color" aria-label="Primary colour picker" class="h-[46px] w-14 border border-border" @input="edited('primary')"></div></template>
          </AdminFormField>
          <AdminFormField name="accent" label="Accent colour" hint="Falls back to the primary colour." :error="v.errorFor('accent')">
            <template #default="s"><div class="flex gap-2"><input :id="s.id" v-model="form.accent" class="inp" placeholder="#RRGGBB" maxlength="7" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="edited('accent')" @blur="v.touch('accent')"><input v-model="form.accent" type="color" aria-label="Accent colour picker" class="h-[46px] w-14 border border-border" @input="edited('accent')"></div></template>
          </AdminFormField>
          <AdminFormField name="background" label="Background colour" required hint="The page behind everything on the storefront. Cards, borders and soft tints are derived from it." :error="v.errorFor('background')">
            <template #default="s"><div class="flex gap-2"><input :id="s.id" v-model="form.background" class="inp" placeholder="#RRGGBB" maxlength="7" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="edited('background')" @blur="v.touch('background')"><input v-model="form.background" type="color" aria-label="Background colour picker" class="h-[46px] w-14 border border-border" @input="edited('background')"></div></template>
          </AdminFormField>
          <AdminFormField name="text" label="Text colour" required hint="Headings and body text. Muted and secondary text are derived from it." :error="v.errorFor('text')">
            <template #default="s"><div class="flex gap-2"><input :id="s.id" v-model="form.text" class="inp" placeholder="#RRGGBB" maxlength="7" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="edited('text')" @blur="v.touch('text')"><input v-model="form.text" type="color" aria-label="Text colour picker" class="h-[46px] w-14 border border-border" @input="edited('text')"></div></template>
          </AdminFormField>
        </div>
        <ul v-if="ratios.length" class="flex flex-col gap-1 text-[13.5px]" aria-label="Readability">
          <li v-for="r in ratios" :key="r.key" class="flex items-center gap-2" :class="r.value >= r.need ? 'text-body' : 'text-accent'">
            <span aria-hidden="true">{{ r.value >= r.need ? '✓' : '!' }}</span>{{ r.label }}: <b>{{ fmt(r.value) }}</b> <span class="text-muted">(needs {{ r.need }}:1)</span>
          </li>
        </ul>
        <p v-if="issues.length" class="err" role="alert">{{ issues.map((i) => MESSAGES[i]).join(' ') }} You will be asked to confirm before publishing. Text on buttons is switched automatically.</p>
        <h3 class="text-xl">Custom palettes <span class="hint">(up to 5, optional)</span></h3>
        <ul class="flex flex-col gap-2">
          <li v-for="p in customs" :key="p.id" class="flex items-center gap-3">
            <button class="flex flex-1 items-center gap-3 border border-border p-2 text-left" @click="pick(p)"><span class="flex h-6 w-16"><span class="flex-1" :style="swatch(p.primary_hex)" /><span class="flex-1" :style="swatch(p.accent_hex)" /><span class="flex-1" :style="swatch(p.background_hex)" /></span>{{ p.name }}</button>
            <button class="hint min-h-11 underline" :aria-label="`Delete ${p.name}`" @click="removeCustom(p)">Delete</button>
          </li>
          <li v-if="!customs.length" class="hint">No custom palettes yet.</li>
        </ul>
        <form class="grid items-end gap-3 sm:grid-cols-[1fr_auto]" novalidate @submit.prevent="addCustom">
          <AdminFormField name="palette_name" label="Save the colours above as a palette" required :error="nameCheck.errorFor('name')">
            <template #default="s"><input :id="s.id" v-model="customName" class="inp" maxlength="40" placeholder="My palette" :aria-invalid="s.invalid" :aria-describedby="s.describedby" @input="nameCheck.onInput('name')" @blur="nameCheck.touch('name')"></template>
          </AdminFormField>
          <button class="btn-secondary">Save palette</button>
        </form>
      </div>
      <div class="card">
        <h2 class="text-2xl">Live preview</h2>
        <!-- Tokens are scoped to this panel only; nothing goes live until Save & publish. -->
        <div class="flex flex-col gap-4 border-t-[6px] border-accent bg-bg p-6 text-ink" :style="preview">
          <div class="font-display text-2xl text-primary">Quiet luxury, worn close</div>
          <p class="text-[14.5px] text-body">Body text sits on the page background. <span class="text-muted">Secondary text is softer.</span></p>
          <a href="#preview" class="text-primary underline" @click.prevent>Preview of a link</a>
          <div class="flex flex-wrap items-center gap-3">
            <span class="btn">Shop now</span><span class="btn-secondary">Details</span>
            <span class="bg-accent px-2.5 py-1 text-[13px] font-semibold text-primary-contrast">−20%</span>
          </div>
          <div class="border border-border bg-surface p-3 text-sm"><span class="bg-primary-soft px-2 py-1 text-primary">Active navigation</span></div>
          <div class="bg-cream p-3 text-sm">A tinted section strip</div>
          <input class="inp !border-field focus:outline focus:outline-2 focus:outline-primary" placeholder="Form field with focus ring" aria-label="Preview field">
        </div>
        <div class="flex flex-wrap gap-3">
          <button class="btn btn-spin" :disabled="!valid || busy" :aria-busy="busy" data-track="theme_publish" @click="publish">Save &amp; publish</button>
          <button class="btn-secondary" :disabled="busy" @click="reset">Reset to Signature</button>
        </div>
        <p class="hint">Last changed by {{ state?.updated_by || '—' }}<template v-if="state"> · {{ new Date(state.updated_at).toLocaleString() }}</template>. The storefront updates as soon as you publish; open pages pick it up on their next load.</p>
        <p v-if="error" class="err" role="alert">{{ error }}</p>
      </div>
    </div>
  </section>
</template>
