/* ─── Tenant stay (the hero "When" value) ───
   One immutable object describes what the tenant picked:
     { period, checkIn, checkOut, startHour, endHour, duration }
   period     an id from config/stayPeriods, or null (not chosen yet)
   checkIn    "YYYY-MM-DD" | ""   — booking / check-in / move-in day
   checkOut   "YYYY-MM-DD" | ""   — picked (range periods) or derived (Monthly)
   startHour  0–23 | null         — Hourly start, or Few nights check-in time
   endHour    1–24 | null         — Hourly end, or Few nights check-out time
   duration   number | 0          — months / years for counted periods
   Home builds it, the URL carries it, SearchResults reads it back — all
   through these helpers, so the picker, the query and the chip never drift. */

import { STAY_PERIODS } from "../config/stayPeriods.js";
import {
  addMonthsClamped,
  formatDate,
  formatDateRange,
  fromDateKey,
  nextRange,
  nightsBetween,
  toDateKey,
} from "./dateRange.js";

export const EMPTY_STAY = {
  period: null,
  checkIn: "",
  checkOut: "",
  startHour: null,
  endHour: null,
  duration: 0,
};

export const STAY_PARAM_KEYS = ["stay", "checkIn", "checkOut", "startHour", "endHour", "duration"];

export const getStayPeriod = (id) => STAY_PERIODS.find((p) => p.id === id) || null;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

export const plural = (n, unit) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/* Monthly end date follows from move-in + months (Yearly has no dates). */
const deriveCheckOut = (period, checkIn, duration) => {
  const def = getStayPeriod(period);
  const start = fromDateKey(checkIn);
  if (!def?.leaseMonths || def.dates !== "day" || !start || !duration) return "";
  return toDateKey(addMonthsClamped(start, duration * def.leaseMonths));
};

/* An hour on `dayKey` that has already started (today only). */
export const isPastHour = (dayKey, hour, now = new Date()) =>
  dayKey === toDateKey(now) && hour <= now.getHours();

/* Switching period keeps the days that still make sense and resets the rest. */
export function selectStayPeriod(stay, periodId) {
  const def = getStayPeriod(periodId);
  if (!def) return stay;
  const prev = getStayPeriod(stay.period);
  const checkIn = def.dates ? stay.checkIn : "";
  const keepRange = def.dates === "range" && prev?.dates === "range";
  const duration = def.count ? def.count.default : 0;
  return {
    ...EMPTY_STAY,
    period: def.id,
    checkIn,
    checkOut: keepRange ? stay.checkOut : deriveCheckOut(def.id, checkIn, duration),
    duration,
  };
}

/* Drops a start time that is already in the past for the chosen day. */
const dropPastStart = (stay, now) => {
  if (stay.startHour == null || !isPastHour(stay.checkIn, stay.startHour, now)) return stay;
  const def = getStayPeriod(stay.period);
  // Hourly's end belongs to its start; Few nights' check-out time does not.
  return { ...stay, startHour: null, endHour: def?.times === "range" ? null : stay.endHour };
};

export function selectStayDay(stay, date, now = new Date()) {
  const def = getStayPeriod(stay.period);
  if (!def?.dates) return stay;
  let next;
  if (def.dates === "range") {
    const range = nextRange(fromDateKey(stay.checkIn), fromDateKey(stay.checkOut), date, {
      allowSame: false,
    });
    next = { ...stay, checkIn: toDateKey(range.start), checkOut: toDateKey(range.end) };
  } else {
    const checkIn = toDateKey(date);
    next = { ...stay, checkIn, checkOut: deriveCheckOut(stay.period, checkIn, stay.duration) };
  }
  return dropPastStart(next, now);
}

/* Hourly: click a start hour, then an end hour (same rule as the calendar). */
export function selectStayHour(stay, hour) {
  const range = nextRange(stay.startHour, stay.endHour, hour, { allowSame: false });
  return { ...stay, startHour: range.start, endHour: range.end };
}

/* Few nights: check-in time (startHour) or check-out time (endHour). */
export function setStayTime(stay, field, hour) {
  if (field !== "startHour" && field !== "endHour") return stay;
  return { ...stay, [field]: stay[field] === hour ? null : hour };
}

export function setStayDuration(stay, duration) {
  const def = getStayPeriod(stay.period);
  if (!def?.count) return stay;
  const next = clamp(duration, def.count.min, def.count.max);
  return { ...stay, duration: next, checkOut: deriveCheckOut(stay.period, stay.checkIn, next) };
}

/* Clears the picks but keeps the chosen period. */
export const clearStayDates = (stay) =>
  selectStayPeriod({ ...EMPTY_STAY, period: stay.period }, stay.period);

/* 14 → "2 PM", 0 / 24 → "12 AM". */
export function formatHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

export function formatDuration(period, duration) {
  const def = getStayPeriod(period);
  if (!def?.count || !duration) return "";
  return plural(duration, def.count.unit);
}

export const stayNights = (stay) =>
  nightsBetween(fromDateKey(stay.checkIn), fromDateKey(stay.checkOut));

export const stayHours = (stay) =>
  stay.startHour != null && stay.endHour != null ? stay.endHour - stay.startHour : 0;

/* Short label for the trigger and the results chip.
   Hourly "Oct 5 · 5 PM – 10 PM" · Nightly "Oct 5 – Oct 8" ·
   Few nights "Oct 5, 2 PM – Oct 8, 11 AM" · Monthly "Oct 5 · 3 months" ·
   Yearly "3 years"
   `compact` (the narrow search-bar trigger) leaves out Few nights' times. */
export function formatStay(stay, { compact = false } = {}) {
  const def = getStayPeriod(stay.period);
  if (!def) return "";
  if (!def.dates) return formatDuration(stay.period, stay.duration);

  const start = fromDateKey(stay.checkIn);
  if (!start) return "";
  const end = fromDateKey(stay.checkOut);

  if (def.times === "range") {
    if (stay.startHour == null) return formatDate(start);
    if (stay.endHour == null) return `${formatDate(start)} · from ${formatHour(stay.startHour)}`;
    return `${formatDate(start)} · ${formatHour(stay.startHour)} – ${formatHour(stay.endHour)}`;
  }
  if (def.times === "checkInOut" && !compact) {
    const withTime = (date, hour) => (hour == null ? formatDate(date) : `${formatDate(date)}, ${formatHour(hour)}`);
    const first = withTime(start, stay.startHour);
    return end ? `${first} – ${withTime(end, stay.endHour)}` : first;
  }
  if (def.dates === "range") return formatDateRange(start, end);

  const length = formatDuration(stay.period, stay.duration);
  return length ? `${formatDate(start)} · ${length}` : formatDate(start);
}

/* Months the tenant wants to stay, for the leaseTerm filter (null = no filter). */
export function stayLeaseMonths(stay) {
  const def = getStayPeriod(stay.period);
  if (!def?.leaseMonths || !stay.duration) return null;
  return stay.duration * def.leaseMonths;
}

/* stay → [key, value] pairs for the search URL (empty values omitted). */
export function stayToParams(stay) {
  if (!getStayPeriod(stay.period)) return [];
  const pairs = [["stay", stay.period]];
  if (stay.checkIn) pairs.push(["checkIn", stay.checkIn]);
  if (stay.checkOut) pairs.push(["checkOut", stay.checkOut]);
  if (stay.startHour != null) pairs.push(["startHour", String(stay.startHour)]);
  if (stay.endHour != null) pairs.push(["endHour", String(stay.endHour)]);
  if (stay.duration) pairs.push(["duration", String(stay.duration)]);
  return pairs;
}

const intParam = (params, key, min, max) => {
  const raw = params.get(key);
  if (raw == null || !/^\d+$/.test(raw)) return null;
  const n = Number(raw);
  return n >= min && n <= max ? n : null;
};

/* URLSearchParams → validated stay. Tampered values fall back to empty. */
export function stayFromParams(params) {
  /* Links from before periods existed carry only checkIn/checkOut → nightly. */
  const def =
    getStayPeriod(params.get("stay")) ||
    (params.get("checkIn") ? getStayPeriod("nightly") : null);
  if (!def) return EMPTY_STAY;

  const checkIn = def.dates && fromDateKey(params.get("checkIn")) ? params.get("checkIn") : "";
  const rawOut = params.get("checkOut");
  const duration = def.count
    ? (intParam(params, "duration", def.count.min, def.count.max) ?? def.count.default)
    : 0;

  let checkOut = "";
  if (def.dates === "range" && checkIn && fromDateKey(rawOut) && rawOut > checkIn) checkOut = rawOut;
  if (def.dates === "day") checkOut = deriveCheckOut(def.id, checkIn, duration);

  let startHour = null;
  let endHour = null;
  if (def.times === "range") {
    startHour = intParam(params, "startHour", 0, 23);
    endHour = startHour == null ? null : intParam(params, "endHour", startHour + 1, 24);
  } else if (def.times === "checkInOut") {
    startHour = intParam(params, "startHour", 0, 23);
    endHour = intParam(params, "endHour", 0, 23);
  }

  return { period: def.id, checkIn, checkOut, startHour, endHour, duration };
}
