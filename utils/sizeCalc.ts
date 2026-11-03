// SRS CAT-08: size calculator. Thresholds come from the admin-managed size chart rows, so
// editing the chart changes the calculator. Band maths follows the SizeGuide board.
export interface BraChart { bands: { size: number; min: number; max: number }[]; cups: { cup: string; min: number; max: number }[] }
export interface ApparelChart { rows: { size: string; bust: number[]; waist: number[]; hip: number[] }[] }

export function braSize(chart: BraChart, underBust: number, bust: number) {
  if (!(underBust > 0 && bust > underBust)) return null
  const inches = underBust / 2.54
  const band = Math.max(30, Math.min(44, 2 * Math.round(inches / 2)))
  const diff = bust - underBust
  const cup = chart.cups.find((c) => diff <= c.max)?.cup ?? 'DDD'
  return { band, cup, label: `${band}${cup}` }
}

export function apparelSize(chart: ApparelChart, hip: number): string {
  return chart.rows.find((r) => hip <= r.hip[1])?.size ?? 'XXL'
}
