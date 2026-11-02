export type WeightUnit = 'kg' | 'lb';

/** Most routines a user can save (also enforced in the database). */
export const MAX_ROUTINES = 4;

export function asUnit(u: string | null | undefined): WeightUnit {
  return u === 'lb' ? 'lb' : 'kg';
}

const KG_PER_LB = 0.45359237;

export function kgToUnit(kg: number | null | undefined, unit: WeightUnit): number | null {
  if (kg == null) return null;
  return unit === 'kg' ? kg : kg / KG_PER_LB;
}

export function unitToKg(value: number | null | undefined, unit: WeightUnit): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return unit === 'kg' ? value : value * KG_PER_LB;
}

/** Round for display: whole numbers stay whole, otherwise 1 decimal. */
export function formatWeight(kg: number | null | undefined, unit: WeightUnit, withUnit = true): string {
  const v = kgToUnit(kg, unit);
  if (v == null) return withUnit ? `– ${unit}` : '–';
  const rounded = Math.round(v * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return withUnit ? `${text} ${unit}` : text;
}

/** Value to put in an input field (no unit suffix, blank when null). */
export function weightInputValue(kg: number | null | undefined, unit: WeightUnit): string {
  if (kg == null) return '';
  const v = kgToUnit(kg, unit)!;
  const rounded = Math.round(v * 100) / 100;
  return String(rounded);
}

export function parseWeightInput(text: string, unit: WeightUnit): number | null {
  const cleaned = text.replace(',', '.').trim();
  if (!cleaned) return null;
  const n = Number(cleaned);
  if (Number.isNaN(n)) return null;
  return unitToKg(n, unit);
}

export function formatVolume(kg: number | null | undefined, unit: WeightUnit): string {
  const v = kgToUnit(kg ?? 0, unit) ?? 0;
  const rounded = Math.round(v);
  return `${rounded.toLocaleString()} ${unit}`;
}
