/* ─── Tenant stay (the hero "When" value) ───
   One immutable object describes what the tenant picked:
     { period, checkIn, checkOut, startHour, duration }
   period     "hourly" | "nightly" | "monthly" | "yearly" | null (not chosen)
   checkIn    "YYYY-MM-DD" | ""
   checkOut   "YYYY-MM-DD" | "" — picked (nightly) or derived (monthly/yearly)
   startHour  0–23 | null     — hourly only
   duration   number | 0      — hours / months / years for stepper periods
   Home builds it, the URL carries it, SearchResults reads it back — all
   through these helpers, so the picker, the query and the chip never drift. */

import { STAY_PERIODS } from "../config/stayPeriods.js";
import {
  addMonthsClamped,
  formatDate,
  formatDateRange,
  fromDateKey,
  nextDateRange,
  toDateKey,
} from "./dateRange.js";

export const EMPTY_STAY = {
  period: null,
  checkIn: "",
  checkOut: "",
  startHour: null,
  duration: 0,
};

export const STAY_PARAM_KEYS = ["stay", "checkIn", "checkOut", "startHour", "duration"];

export const getStayPeriod = (id) => STAY_PERIODS.find((p) => p.id === id) || null;

const clamp = (n, min, max) => Math.min(max, Math.max(min, n));

/* Monthly/yearly end date follows from move-in + duration. */
const deriveCheckOut = (period, checkIn, duration) => {
  const def = getStayPeriod(period);
  const start = fromDateKey(checkIn);
  if (!def?.leaseMonths || !start || !duration) return "";
  return toDateKey(addMonthsClamped(start, duration * def.leaseMonths));
};

/* Switching period keeps the chosen move-in day and resets the rest. */
export function selectStayPeriod(stay, periodId) {
  const def = getStayPeriod(periodId);
  if (!def) return stay;
  const duration = def.duration ? def.duration.default : 0;
  return {
    ...EMPTY_STAY,
    period: def.id,
    checkIn: stay.checkIn,
    duration,
    checkOut: deriveCheckOut(def.id, stay.checkIn, duration),
  };
}

export function selectStayDay(stay, date) {
  if (stay.period === "nightly") {
    const range = nextDateRange(fromDateKey(stay.checkIn), fromDateKey(stay.checkOut), date);
    return { ...stay, checkIn: toDateKey(range.start), checkOut: toDateKey(range.end) };
  }
  const checkIn = toDateKey(date);
  return { ...stay, checkIn, checkOut: deriveCheckOut(stay.period, checkIn, stay.duration) };
}

export function setStayDuration(stay, duration) {
  const def = getStayPeriod(stay.period);
  if (!def?.duration) return stay;
  const next = clamp(duration, def.duration.min, def.duration.max);
  return { ...stay, duration: next, checkOut: deriveCheckOut(stay.period, stay.checkIn, next) };
}

export function setStayStartHour(stay, hour) {
  return { ...stay, startHour: hour };
}

/* Clears the dates/times but keeps the chosen period. */
export const clearStayDates = (stay) => selectStayPeriod({ ...stay, checkIn: "" }, stay.period);

/* 14 → "2 PM", 0 → "12 AM", 24+ wraps to the next day. */
export function formatHour(hour) {
  const h = ((hour % 24) + 24) % 24;
  const suffix = h < 12 ? "AM" : "PM";
  return `${h % 12 === 0 ? 12 : h % 12} ${suffix}`;
}

export function formatDuration(period, duration) {
  const def = getStayPeriod(period);
  if (!def?.duration || !duration) return "";
  return `${duration} ${def.duration.unit}${duration === 1 ? "" : "s"}`;
}

/* Short label for the trigger and the results chip.
   Nightly "Oct 5 – Oct 20" · Hourly "Oct 5 · 10 AM – 12 PM" ·
   Monthly "Oct 5 · 3 months" · Yearly "Oct 5 · 1 year" */
export function formatStay(stay) {
  const start = fromDateKey(stay.checkIn);
  if (!start) return "";
  if (stay.period === "nightly") return formatDateRange(start, fromDateKey(stay.checkOut));
  if (stay.period === "hourly") {
    if (stay.startHour == null) return formatDate(start);
    return `${formatDate(start)} · ${formatHour(stay.startHour)} – ${formatHour(stay.startHour + stay.duration)}`;
  }
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
  if (stay.period === "hourly" && stay.startHour != null) pairs.push(["startHour", String(stay.startHour)]);
  if (stay.duration) pairs.push(["duration", String(stay.duration)]);
  return pairs;
}

/* URLSearchParams → validated stay. Tampered values fall back to empty. */
export function stayFromParams(params) {
  /* Links from before periods existed carry only checkIn/checkOut → nightly. */
  const def =
    getStayPeriod(params.get("stay")) ||
    (params.get("checkIn") ? getStayPeriod("nightly") : null);
  if (!def) return EMPTY_STAY;
  const checkIn = fromDateKey(params.get("checkIn")) ? params.get("checkIn") : "";
  const rawDuration = Number.parseInt(params.get("duration") || "", 10);
  const duration = def.duration
    ? clamp(Number.isNaN(rawDuration) ? def.duration.default : rawDuration, def.duration.min, def.duration.max)
    : 0;
  const rawHour = Number.parseInt(params.get("startHour") || "", 10);
  const startHour = def.id === "hourly" && rawHour >= 0 && rawHour <= 23 ? rawHour : null;
  const checkOut =
    def.id === "nightly"
      ? (fromDateKey(params.get("checkOut")) ? params.get("checkOut") : "")
      : deriveCheckOut(def.id, checkIn, duration);
  return { period: def.id, checkIn, checkOut, startHour, duration };
}
