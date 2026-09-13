/* ─── Date helpers shared by the calendar pickers, search URLs and chips ───
   Pure (no React) so they can be unit-tested with node --test.
   MonthGrid re-exports the formatters for its existing callers. */

export const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/* "Feb 28" */
export function formatDate(date) {
  if (!date) return "";
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}

/* "Feb 28" for a single day / "Feb 28 – Mar 5" for a range */
export function formatDateRange(start, end) {
  if (!start) return "";
  if (!end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/* "Feb 28, 2027" */
export function formatDateLong(date) {
  if (!date) return "";
  return `${formatDate(date)}, ${date.getFullYear()}`;
}

/* Click-to-select range rule used by every two-click calendar:
   first click (or a click after a full range) starts a new range; a click
   before the start restarts from that day; otherwise it sets the end. */
export function nextDateRange(start, end, date) {
  if (!start || end || date < start) return { start: date, end: null };
  return { start, end: date };
}

/* Adds calendar months, clamping to the last day of the target month
   (Jan 31 + 1 month → Feb 28, not Mar 3). */
export function addMonthsClamped(date, months) {
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return target;
}

/* Local-calendar "YYYY-MM-DD" keys — safe in URLs and immune to the UTC
   shift `toISOString()` causes for users east of Greenwich (PKT is +5). */
export function toDateKey(date) {
  if (!date) return "";
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${m}-${d}`;
}

export function fromDateKey(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || "");
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}
