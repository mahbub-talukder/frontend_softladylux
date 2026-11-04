// SRS ACC-01: resend is allowed after 60 s; the code is 6 digits.
export const RESEND_SECONDS = 60
export const isCode = (v: string) => /^\d{6}$/.test(v.trim())
export const cleanCode = (v: string) => v.replace(/\D/g, '').slice(0, 6)
export function secondsLeft(sentAt: number, now = Date.now(), total = RESEND_SECONDS) {
  return Math.max(0, Math.ceil(total - (now - sentAt) / 1000))
}
// ACC-12: at least 8 characters, must not equal the mobile number (the server enforces it too).
export function passwordProblem(pw: string, phone: string): string {
  if (pw.length < 8) return 'Use at least 8 characters.'
  if (pw.replace(/\D/g, '') === phone.replace(/\D/g, '') && phone) return 'Your password cannot be your mobile number.'
  return ''
}
// ACC-14 / §10: Bangladeshi mobile, 01XXXXXXXXX (+880 / 880 accepted)
export function normalizePhone(v: string): string | null {
  let raw = v.replace(/[\s\-()]/g, '')
  if (raw.startsWith('+880')) raw = `0${raw.slice(4)}`
  else if (raw.startsWith('880') && raw.length === 13) raw = `0${raw.slice(3)}`
  return /^01[3-9]\d{8}$/.test(raw) ? raw : null
}
