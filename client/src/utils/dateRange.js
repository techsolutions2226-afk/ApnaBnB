/* ─── Date-range helpers shared by the calendar pickers ───
   Pure (no React) so they can be unit-tested with node --test.
   Display formatting stays with MonthGrid (formatDate / formatDateRange). */

/* Click-to-select range rule used by every two-click calendar:
   first click (or a click after a full range) starts a new range; a click
   before the start restarts from that day; otherwise it sets the end. */
export function nextDateRange(start, end, date) {
  if (!start || end || date < start) return { start: date, end: null };
  return { start, end: date };
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
