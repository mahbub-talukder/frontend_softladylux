// SRS NTF-05 (amendment v1.6): WhatsApp and Call links from Site settings (header and footer).
// Bangladeshi numbers are usually entered in national format (01XXXXXXXXX / 09XXXXXXXXX), but
// wa.me and tel: need the international form (8801XXXXXXXXX), so a leading 0 becomes 880.

/** Digits only, in international format. '' when there is no usable number. */
export function intlDigits(raw: string | null | undefined): string {
  let d = String(raw ?? '').replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2) // 00880… dialling prefix
  else if (d.startsWith('0')) d = `88${d}` // national BD format
  return d.length >= 8 ? d : ''
}

/** wa.me opens the WhatsApp app when it is installed (phone or desktop), else WhatsApp Web. */
export function waLink(raw: string | null | undefined): string {
  const d = intlDigits(raw)
  return d ? `https://wa.me/${d}` : ''
}

/** tel: opens the phone dialer (or the desktop calling app). */
export function telLink(raw: string | null | undefined): string {
  const d = intlDigits(raw)
  return d ? `tel:+${d}` : ''
}
