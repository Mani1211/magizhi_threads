/**
 * Measurement catalogue for Magizhi Threads.
 *
 * FIELDS is the full-body list, in the shop's order and sections (Shoulder, Neck, Apex, Chest,
 * Waist, Bottom length, Armhole, Sleeves, Length measurements). Each garment type picks the fields it needs.
 * Blouse and Kurti come from the shop's own list. Maxi, Anarkali and Pant are
 * provisional and will be replaced once their lists are confirmed; add or remove
 * keys in GARMENT_TYPES to change what the garment form asks for.
 *
 * All values are stored in inches as numbers, keyed by `key`.
 */
export interface Field {
  key: string;
  /** Label shown inside its group (or on its own when it has no group). */
  label: string;
  group: string | null;
  /** Label that makes sense out of context, e.g. "Shoulder front". */
  full: string;
}

const F = (key: string, label: string, group?: string, full?: string): Field => ({
  key, label, group: group ?? null, full: full ?? label,
});

export const FIELDS: Field[] = [
  F('full_length', 'Full length'),
  F('shoulder_full', 'Full shoulder', 'Shoulder'),
  F('shoulder_front', 'Front', 'Shoulder', 'Shoulder front'),
  F('shoulder_back', 'Back', 'Shoulder', 'Shoulder back'),
  F('neck_round', 'Neck round', 'Neck'),
  F('neck_front', 'Neck front', 'Neck'),
  F('neck_back', 'Neck back', 'Neck'),
  F('apex', 'Apex', 'Apex'),
  F('apex_to_apex', 'Apex to apex', 'Apex'),
  F('chest_upper', 'Upper chest', 'Chest'),
  F('chest_mid', 'Mid chest', 'Chest'),
  F('chest_under', 'Under chest', 'Chest'),
  F('waist', 'Waist', 'Waist'),
  F('bottom_length', 'Length', 'Bottom length', 'Bottom length'),
  F('waist_mid', 'Mid waist', 'Bottom length'),
  F('seat', 'Seat', 'Bottom length'),
  F('thighs', 'Thighs', 'Bottom length'),
  F('knees', 'Knees', 'Bottom length'),
  F('ankle', 'Ankle', 'Bottom length'),
  F('armhole', 'Armhole', 'Armhole'),
  F('armhole_length', 'Armhole length', 'Armhole'),
  F('sleeve_length', 'Sleeve length', 'Sleeves'),
  F('sleeve_5', 'Circ. at 5 inch', 'Sleeves', 'Sleeve circ. at 5"'),
  F('sleeve_8', 'Circ. at 8 inch', 'Sleeves', 'Sleeve circ. at 8"'),
  F('sleeve_10', 'Circ. at 10 inch', 'Sleeves', 'Sleeve circ. at 10"'),
  F('elbow', 'Elbow', 'Sleeves'),
  F('cuff', 'Cuff', 'Sleeves'),
  F('sh_waist', 'Shoulder to waist', 'Length measurements'),
  F('sh_seat', 'Shoulder to seat', 'Length measurements'),
  F('sh_apex', 'Shoulder to apex', 'Length measurements'),
];

export const ALL_KEYS = FIELDS.map((f) => f.key);
export const FIELD_BY_KEY: Record<string, Field> = Object.fromEntries(FIELDS.map((f) => [f.key, f]));

const NECK = ['neck_round', 'neck_front', 'neck_back'];
const SHOULDER = ['shoulder_full', 'shoulder_front', 'shoulder_back'];
const CHEST = ['chest_upper', 'chest_mid', 'chest_under'];
const SLEEVE_C = ['sleeve_5', 'sleeve_8', 'sleeve_10'];

export interface GarmentType {
  id: string;
  label: string;
  keys: string[];
}

export const GARMENT_TYPES: GarmentType[] = [
  { id: 'blouse', label: 'Blouse',
    keys: ['full_length', ...NECK, 'apex_to_apex', 'apex', 'waist', ...SHOULDER, 'armhole', 'sleeve_length', ...SLEEVE_C, ...CHEST] },
  { id: 'kurti', label: 'Kurti',
    keys: [...SHOULDER, 'full_length', ...NECK, ...CHEST, 'waist', 'seat', 'armhole', ...SLEEVE_C, 'sleeve_length', 'sh_apex', 'sh_waist', 'sh_seat'] },
  // Provisional list — to be confirmed.
  { id: 'maxi', label: 'Maxi',
    keys: ['full_length', ...SHOULDER, ...NECK, 'apex', 'apex_to_apex', ...CHEST, 'waist', 'seat', 'armhole', 'sleeve_length', ...SLEEVE_C, 'sh_apex', 'sh_waist'] },
  // Provisional list — to be confirmed.
  { id: 'anarkali', label: 'Anarkali',
    keys: ['full_length', ...SHOULDER, ...NECK, 'apex', 'apex_to_apex', ...CHEST, 'waist', 'armhole', 'sleeve_length', ...SLEEVE_C, 'sh_apex', 'sh_waist'] },
  // Provisional list — to be confirmed.
  { id: 'pant', label: 'Pant',
    keys: ['bottom_length', 'waist', 'seat', 'thighs', 'knees', 'ankle'] },
];

const TYPE_BY_ID: Record<string, GarmentType> = Object.fromEntries(GARMENT_TYPES.map((t) => [t.id, t]));

/** Look up a garment type; unknown ids (e.g. a type removed later) still render. */
export function garmentType(id: string): GarmentType {
  return TYPE_BY_ID[id] ?? { id, label: id.charAt(0).toUpperCase() + id.slice(1), keys: [] };
}

/** CSS colour for a type's badge and accents. */
export const typeColor = (id: string) => `var(--t-${id}, var(--muted))`;

/** These change with every garment, so they are never copied from body measurements. */
export const LENGTH_KEYS = new Set(['full_length', 'sleeve_length']);

/** The three measurements shown on a garment's card. */
export const SUMMARY: Record<string, [key: string, label: string][]> = {
  blouse: [['chest_upper', 'Chest'], ['waist', 'Waist'], ['full_length', 'Length']],
  kurti: [['chest_mid', 'Chest'], ['seat', 'Seat'], ['full_length', 'Length']],
  maxi: [['chest_mid', 'Chest'], ['waist', 'Waist'], ['full_length', 'Length']],
  anarkali: [['chest_mid', 'Chest'], ['waist', 'Waist'], ['full_length', 'Length']],
  pant: [['waist', 'Waist'], ['seat', 'Seat'], ['bottom_length', 'Length']],
};

export type Measurements = Record<string, number>;

const FRAC: Record<string, string> = { '0.125': '⅛', '0.25': '¼', '0.375': '⅜', '0.5': '½', '0.625': '⅝', '0.75': '¾', '0.875': '⅞' };
const FRAC_VALUE: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅛': 0.125, '⅜': 0.375, '⅝': 0.625, '⅞': 0.875 };

/** 14.5 → "14½″"; blank → "—". */
export function formatInch(v: number | null | undefined): string {
  if (v == null || Number.isNaN(v)) return '—';
  const whole = Math.floor(v);
  const frac = +(v - whole).toFixed(3);
  if (frac === 0) return `${whole}″`;
  const glyph = FRAC[String(frac)];
  if (glyph) return `${whole || ''}${glyph}″`;
  return `${+v.toFixed(2)}″`;
}

/**
 * Accepts 14, 14.5, 14 1/2, 14½ or 14" and returns the number.
 * Returns null for a blank value and NaN for anything that isn't a measurement.
 */
export function parseInch(raw: string | null | undefined): number | null {
  let s = String(raw ?? '').trim();
  if (!s) return null;
  let extra = 0;
  s = s.replace(/[½¼¾⅛⅜⅝⅞]/g, (m) => { extra += FRAC_VALUE[m]; return ''; });
  s = s.replace(/(″|"|in(ch(es)?)?)$/i, '').trim();
  if (s === '') return extra || NaN;
  let m = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (m && +m[3]) return +m[1] + +m[2] / +m[3];
  m = s.match(/^(\d+)\/(\d+)$/);
  if (m && +m[2]) return +m[1] / +m[2];
  if (/^\d+(\.\d+)?$/.test(s) || /^\.\d+$/.test(s)) return +s + extra;
  return NaN;
}

/** Numbers → strings for form inputs. */
export function toRaw(values: Measurements | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(values ?? {})) out[k] = String(v);
  return out;
}

/** Parse form inputs for the given keys; collects keys whose value isn't a number. */
export function parseAll(raw: Record<string, string>, keys: string[]): { values: Measurements; bad: string[] } {
  const values: Measurements = {};
  const bad: string[] = [];
  for (const k of keys) {
    const v = parseInch(raw[k]);
    if (v === null) continue;
    if (Number.isNaN(v)) bad.push(k);
    else values[k] = Math.round(v * 1000) / 1000;
  }
  return { values, bad };
}
