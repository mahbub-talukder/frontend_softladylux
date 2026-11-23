// Covers SRS v1.11 CAT-12: the Buy dialog's selection rules. Add to Cart / Checkout Now stay disabled
// (chosenVariant === null) until every required option is chosen; single options are preselected; sold out is never chosen.
import { describe, expect, it } from 'vitest'
import { chosenVariant, coloursOf, initialState, missing, needsSize, sizesOf } from '../composables/buySelection'
import type { CardVariant } from '../composables/useQuickAdd'

const v = (id: number, color_name: string, size_label: string, in_stock = true): CardVariant => ({ id, color_name, size_label, in_stock })
const multi = [v(1, 'Rose', '32B'), v(2, 'Rose', '34B'), v(3, 'Black', '32B'), v(4, 'Black', '34B', false)]

describe('Buy dialog selection (CAT-12)', () => {
  it('needs colour and size before a variant is chosen', () => {
    const st = initialState(multi)
    expect(st).toEqual({ colour: '', size: '' })
    expect(chosenVariant(multi, st)).toBeNull()
    expect(missing(multi, st)).toBe('Please select a colour and size')
    expect(missing(multi, { colour: 'Rose', size: '' })).toBe('Please select a size')
    expect(chosenVariant(multi, { colour: 'Rose', size: '' })).toBeNull()
    expect(chosenVariant(multi, { colour: 'Rose', size: '34B' })?.id).toBe(2)
    expect(missing(multi, { colour: 'Rose', size: '34B' })).toBe('')
  })

  it('never chooses a sold-out variant', () => {
    expect(chosenVariant(multi, { colour: 'Black', size: '34B' })).toBeNull()
    expect(sizesOf(multi, 'Black').find((s) => s.label === '34B')?.disabled).toBe(true)
  })

  it('preselects the only colour and the only size', () => {
    const one = [v(9, 'Nude', 'Free size')]
    expect(initialState(one)).toEqual({ colour: 'Nude', size: 'Free size' })
    expect(chosenVariant(one, initialState(one))?.id).toBe(9)
  })

  it('preselects the colour shown on the card when it has stock', () => {
    expect(initialState(multi, 'black').colour).toBe('Black')
    expect(initialState([v(1, 'Rose', 'S', false), v(2, 'Blue', 'S')]).colour).toBe('Blue') // only one in stock
  })

  it('a colour without size labels needs no size', () => {
    const noSize = [v(5, 'Rose', ''), v(6, 'Black', '')]
    expect(needsSize(noSize, 'Rose')).toBe(false)
    expect(missing(noSize, { colour: '', size: '' })).toBe('Please select a colour')
    expect(chosenVariant(noSize, { colour: 'Black', size: '' })?.id).toBe(6)
    expect(coloursOf(noSize)).toEqual(['Rose', 'Black'])
  })
})
