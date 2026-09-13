import { HOURLY_START_HOURS } from "../../../config/stayPeriods";
import { formatHour } from "../../../utils/stay";
import { toDateKey } from "../../../utils/dateRange";

/* ─── Start-time chips for Hourly stays. On today's date, hours that have
     already started are disabled. Reuses the Beds chip styling. ─── */

export default function HourPicker({ value, onChange, dateKey }) {
  const now = new Date();
  const isToday = dateKey === toDateKey(now);

  return (
    <div className="dd-stay__hours" role="group" aria-label="Start time">
      {HOURLY_START_HOURS.map((hour) => {
        const past = isToday && hour <= now.getHours();
        const active = value === hour;
        return (
          <button
            key={hour}
            type="button"
            className={`dd-beds-chip${active ? " dd-beds-chip--active" : ""}`}
            aria-pressed={active}
            disabled={past}
            onClick={() => onChange(hour)}
          >
            {formatHour(hour)}
          </button>
        );
      })}
    </div>
  );
}
