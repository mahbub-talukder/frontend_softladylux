// SRS rule 1: prices are BDT, VAT inclusive.
export function taka(v: string | number | null | undefined): string {
  const n = Number(v ?? 0)
  return `৳ ${n.toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}
