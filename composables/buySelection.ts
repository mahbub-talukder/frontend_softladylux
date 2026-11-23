// SRS v1.11 CAT-12: pure selection rules behind the Buy dialog (unit-tested in tests/buyDialog.test.ts).
import type { CardVariant } from './useQuickAdd'

export interface BuyState { colour: string; size: string }

export const coloursOf = (variants: CardVariant[]) => [...new Set(variants.map((v) => v.color_name))]
export const sizesOf = (variants: CardVariant[], colour: string) =>
  variants.filter((v) => v.color_name === colour).map((v) => ({ label: v.size_label, variant: v, disabled: !v.in_stock }))
// Size choice is needed only when the chosen colour has more than one size, or its only size has a real label.
export const needsSize = (variants: CardVariant[], colour: string) => sizesOf(variants, colour).some((s) => s.label)
const colourInStock = (variants: CardVariant[], c: string) => variants.some((v) => v.color_name === c && v.in_stock)

/** Initial picks: a single colour (or the only one in stock) and a single size are preselected. */
export function initialState(variants: CardVariant[], shownColour?: string | null): BuyState {
  const colours = coloursOf(variants)
  const inStock = colours.filter((c) => colourInStock(variants, c))
  let colour = ''
  if (colours.length === 1) colour = colours[0]!
  else if (inStock.length === 1) colour = inStock[0]!
  else if (shownColour) colour = inStock.find((c) => c.toLowerCase() === shownColour.toLowerCase()) ?? ''
  const sizes = colour ? sizesOf(variants, colour).filter((s) => !s.disabled) : []
  return { colour, size: sizes.length === 1 ? sizes[0]!.label : '' }
}

/** The variant for the current picks, or null while a required option is missing or the pick is sold out. */
export function chosenVariant(variants: CardVariant[], st: BuyState): CardVariant | null {
  if (!st.colour && coloursOf(variants).length > 1) return null
  const colour = st.colour || coloursOf(variants)[0] || ''
  const sizes = sizesOf(variants, colour)
  const hit = needsSize(variants, colour) ? sizes.find((s) => s.label === st.size) : sizes[0]
  return hit && !hit.disabled ? hit.variant : null
}

/** What is still missing, in words for the disabled buttons' hint. */
export function missing(variants: CardVariant[], st: BuyState): string {
  const needColour = !st.colour && coloursOf(variants).length > 1
  const needSz = !st.size && (st.colour || coloursOf(variants).length === 1) && needsSize(variants, st.colour || coloursOf(variants)[0]!)
  if (needColour && needsSize(variants, coloursOf(variants)[0]!)) return 'Please select a colour and size'
  if (needColour) return 'Please select a colour'
  if (needSz) return 'Please select a size'
  return ''
}
