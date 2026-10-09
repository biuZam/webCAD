// All geometry is stored in millimetres. Units exist only at the UI edge.

export type LengthUnit = 'mm' | 'cm' | 'in'

export const MM_PER_UNIT: Record<LengthUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
}

/** Decimal places shown per unit, so mm displays to 0.01 mm (PRD precision). */
const DISPLAY_DECIMALS: Record<LengthUnit, number> = {
  mm: 2,
  cm: 3,
  in: 4,
}

export function toMm(value: number, unit: LengthUnit): number {
  return value * MM_PER_UNIT[unit]
}

export function fromMm(mm: number, unit: LengthUnit): number {
  return mm / MM_PER_UNIT[unit]
}

/** Round to export precision (0.001 mm). */
export function roundExport(mm: number): number {
  const r = Math.round(mm * 1000) / 1000
  return Object.is(r, -0) ? 0 : r
}

export function formatLength(mm: number, unit: LengthUnit, locale: string, withSymbol = true): string {
  const fmt = new Intl.NumberFormat(locale, {
    maximumFractionDigits: DISPLAY_DECIMALS[unit],
    minimumFractionDigits: 0,
  })
  const text = fmt.format(fromMm(mm, unit))
  // Unit symbols stay Latin in every locale.
  return withSymbol ? `${text} ${unit}` : text
}

/**
 * Parse a typed length such as "12.5", "3cm", "1.5 in", "-2,5mm".
 * A bare number is interpreted in `defaultUnit`. Returns millimetres, or null if invalid.
 */
export function parseLength(input: string, defaultUnit: LengthUnit): number | null {
  const m = /^\s*([-+]?\d*[.,]?\d+)\s*(mm|cm|in|")?\s*$/i.exec(input)
  if (!m) return null
  const value = Number(m[1].replace(',', '.'))
  if (!Number.isFinite(value)) return null
  const raw = m[2]?.toLowerCase()
  const unit: LengthUnit = raw === '"' ? 'in' : ((raw as LengthUnit | undefined) ?? defaultUnit)
  return toMm(value, unit)
}

/** Parse a plain number such as a scale factor ("1.5", "0,75", "×2"). */
export function parseNumber(input: string): number | null {
  const m = /^\s*[×x]?\s*([-+]?\d*[.,]?\d+)\s*$/i.exec(input)
  if (!m) return null
  const value = Number(m[1].replace(',', '.'))
  return Number.isFinite(value) ? value : null
}

/** Parse an angle in degrees ("45", "45°", "-30deg"). */
export function parseAngle(input: string): number | null {
  const m = /^\s*([-+]?\d*[.,]?\d+)\s*(°|deg)?\s*$/i.exec(input)
  if (!m) return null
  const value = Number(m[1].replace(',', '.'))
  return Number.isFinite(value) ? value : null
}
