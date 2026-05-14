/* ─── Calendar helpers ─── */
const DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
export const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function getDaysInMonth(y, m) {
  return new Date(y, m + 1, 0).getDate();
}
export function getFirstDay(y, m) {
  return new Date(y, m, 1).getDay();
}
export function addMonths(d, n) {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}
export function isSameDay(a, b) {
  return (
    a &&
    b &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
export function isBetween(day, s, e) {
  if (!s || !e) return false;
  const [lo, hi] = s < e ? [s, e] : [e, s];
  return day > lo && day < hi;
}

/* Format: "Feb 28" for single / "Feb 28 – Mar 5" for range */
export function formatDate(date) {
  if (!date) return "";
  return `${MONTHS_SHORT[date.getMonth()]} ${date.getDate()}`;
}
export function formatDateRange(start, end) {
  if (!start) return "";
  if (!end) return formatDate(start);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

/* ─── Month Grid ─── */
function MonthGrid({
  year,
  month,
  startDate,
  endDate,
  hoverDate,
  onDayClick,
  onDayHover,
  today,
}) {
  const days = getDaysInMonth(year, month);
  const firstDay = getFirstDay(year, month);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));

  return (
    <div className="cal-month">
      <p className="cal-month-title">
        {MONTHS[month]} {year}
      </p>
      <div className="cal-grid-header">
        {DAYS.map((d, i) => (
          <span key={i} className="cal-day-name">
            {d}
          </span>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((date, i) => {
          if (!date)
            return <span key={i} className="cal-cell cal-cell--empty" />;
          const isPast = date < today;
          const isStart = isSameDay(date, startDate);
          const isEnd = isSameDay(date, endDate);
          const inRange = isBetween(date, startDate, endDate || hoverDate);
          const isToday = isSameDay(date, today);
          let cls = "cal-cell";
          if (isPast) cls += " cal-cell--past";
          if (isStart) cls += " cal-cell--start";
          if (isEnd) cls += " cal-cell--end";
          if (inRange) cls += " cal-cell--range";
          if (isToday && !isStart && !isEnd) cls += " cal-cell--today";
          return (
            <span
              key={i}
              className={cls}
              onClick={() => !isPast && onDayClick(date)}
              onMouseEnter={() => !isPast && onDayHover(date)}
            >
              {date.getDate()}
            </span>
          );
        })}
      </div>
    </div>
  );
}

export default MonthGrid;
