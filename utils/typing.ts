// Header search placeholder that types out rotating suggestions (amendment v1.6, storefront layout).
// A pure state machine so it is unit-tested without timers: each step returns the next state and
// how long to wait before the following step.

export interface TypingState { word: number; chars: number; deleting: boolean }

export const TYPE_MS = 75 // per character typed
export const DELETE_MS = 35 // per character deleted
export const HOLD_MS = 1600 // full word stays visible
export const GAP_MS = 400 // empty pause before the next word

export const TYPING_START: TypingState = { word: 0, chars: 0, deleting: false }

export function typingStep(s: TypingState, words: readonly string[]): { state: TypingState; delay: number } {
  if (!words.length) return { state: TYPING_START, delay: HOLD_MS }
  const word = words[s.word % words.length]
  if (!s.deleting) {
    if (s.chars < word.length) {
      const chars = s.chars + 1
      return { state: { ...s, chars }, delay: chars === word.length ? HOLD_MS : TYPE_MS }
    }
    return { state: { ...s, deleting: true, chars: s.chars - 1 }, delay: DELETE_MS }
  }
  if (s.chars > 0) {
    const chars = s.chars - 1
    return { state: { ...s, chars }, delay: chars === 0 ? GAP_MS : DELETE_MS }
  }
  return { state: { word: (s.word + 1) % words.length, chars: 1, deleting: false }, delay: TYPE_MS }
}

export function typingText(s: TypingState, words: readonly string[]): string {
  return words.length ? words[s.word % words.length].slice(0, s.chars) : ''
}
