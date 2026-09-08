// Size / area unit conversion for ApnaBnB matching.
//
// Listings store { size: number, sizeUnit: "Marla" | "Sq. Ft." | ... }.
// Requirements store a combined string like "1 Marla" or "272 Sq. Ft.".
// Matching normalizes everything to square feet before comparing.
//
// Marla standard: 1 Marla = 272.25 Sq. Ft. (Islamabad / Rawalpindi /
// federal). Lahore's 225 sq ft marla is a local variant — we use the
// federal figure so a 272 sq ft shop and a 1 marla requirement align
// (within the scorer's ±10% band).

const MARLA_TO_SQFT = 272.25;
const KANAL_TO_SQFT = MARLA_TO_SQFT * 20; // 20 marla
const SQ_YD_TO_SQFT = 9;
const SQ_M_TO_SQFT = 10.76391041671;

// Map every unit label we have ever shipped (or seen in seeds) onto one key.
const UNIT_ALIASES = {
  'sq. ft.': 'sqft',
  'sq ft': 'sqft',
  'sqft': 'sqft',
  'sq.ft.': 'sqft',
  'sq.ft': 'sqft',
  'square feet': 'sqft',
  'square foot': 'sqft',
  'ft2': 'sqft',
  'ft²': 'sqft',

  'sq. yd.': 'sqyd',
  'sq yd': 'sqyd',
  'sqyd': 'sqyd',
  'sq.yd.': 'sqyd',
  'square yards': 'sqyd',
  'square yard': 'sqyd',
  'yd2': 'sqyd',
  'yd²': 'sqyd',

  'sq. m.': 'sqm',
  'sq m': 'sqm',
  'sqm': 'sqm',
  'sq.m.': 'sqm',
  'square meters': 'sqm',
  'square metres': 'sqm',
  'square meter': 'sqm',
  'm2': 'sqm',
  'm²': 'sqm',

  marla: 'marla',
  marlas: 'marla',

  kanal: 'kanal',
  kanals: 'kanal',
};

const FACTORS_TO_SQFT = {
  sqft: 1,
  sqyd: SQ_YD_TO_SQFT,
  sqm: SQ_M_TO_SQFT,
  marla: MARLA_TO_SQFT,
  kanal: KANAL_TO_SQFT,
};

const normalizeUnit = (unit) => {
  if (unit == null || unit === '') return null;
  const key = String(unit).trim().toLowerCase().replace(/\s+/g, ' ');
  return UNIT_ALIASES[key] || null;
};

const parseNumber = (raw) => {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : NaN;
  if (typeof raw !== 'string') return NaN;
  return Number.parseFloat(raw.replace(/,/g, '').trim());
};

/**
 * Resolve a size input into { value, unitKey }.
 * Accepts:
 *   - property style: size=272, sizeUnit="Sq. Ft."
 *   - requirement style: size="1 Marla" (sizeUnit optional)
 *   - bare number: size=10 → unit defaults to Marla (legacy property default)
 */
const parseSize = (size, sizeUnit) => {
  if (size == null || size === '') return null;

  if (typeof size === 'number') {
    if (!Number.isFinite(size) || size <= 0) return null;
    return { value: size, unitKey: normalizeUnit(sizeUnit) || 'marla' };
  }

  if (typeof size === 'string') {
    const trimmed = size.trim();
    if (!trimmed) return null;
    const match = trimmed.match(/^([\d.,]+)\s*(.*)$/);
    if (!match) return null;
    const value = parseNumber(match[1]);
    if (!Number.isFinite(value) || value <= 0) return null;
    const unitKey =
      normalizeUnit(match[2]) ||
      normalizeUnit(sizeUnit) ||
      'marla';
    return { value, unitKey };
  }

  return null;
};

/** Convert a parsed size to square feet. Returns null if unknown/invalid. */
const toSqFt = (value, unitKey) => {
  if (!Number.isFinite(value) || value <= 0) return null;
  const factor = FACTORS_TO_SQFT[unitKey];
  if (!factor) return null;
  return value * factor;
};

/** Resolve any listing/requirement size fields to sq ft. */
const resolveSizeSqFt = (size, sizeUnit) => {
  const parsed = parseSize(size, sizeUnit);
  if (!parsed) return null;
  return toSqFt(parsed.value, parsed.unitKey);
};

/**
 * Soft size score points (0 / 5 / 10) after unit conversion.
 * ±10% → 10 pts, ±20% → 5 pts, else 0. Missing either side → 0.
 */
const scoreSizePoints = (property, requirement) => {
  const propSqFt = resolveSizeSqFt(property?.size, property?.sizeUnit);
  const reqSqFt = resolveSizeSqFt(requirement?.size, requirement?.sizeUnit);
  if (!propSqFt || !reqSqFt) return 0;

  const sizeDiff = Math.abs(propSqFt - reqSqFt) / reqSqFt;
  if (sizeDiff <= 0.1) return 10;
  if (sizeDiff <= 0.2) return 5;
  return 0;
};

module.exports = {
  MARLA_TO_SQFT,
  KANAL_TO_SQFT,
  normalizeUnit,
  parseSize,
  toSqFt,
  resolveSizeSqFt,
  scoreSizePoints,
};
