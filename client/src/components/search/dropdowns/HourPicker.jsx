import { useState } from "react";
import { formatHour } from "../../../utils/stay";

/* ─── Hour chips that behave like the calendar.
     mode="range":  tap a start hour, then an end hour — the hours between
                    are tinted and the ends are solid, with a hover preview
                    (Hourly).
     mode="single": one hour (Nightly check-in / check-out time).
     Selection rules live in utils/stay; this only renders and reports taps. ─── */

export default function HourPicker({
  hours,
  mode = "single",
  value = null, // single
  start = null, // range
  end = null, // range
  onPick, // (hour) => void
  isDisabled = () => false,
  label,
}) {
  const [hover, setHover] = useState(null);
  const ranged = mode === "range";
  const previewEnd = ranged && start != null && end == null && hover > start ? hover : null;
  const bandEnd = end ?? previewEnd;

  return (
    <div
      className={`dd-hours dd-hours--${mode}`}
      role="group"
      aria-label={label}
      onMouseLeave={() => setHover(null)}
    >
      {hours.map((hour) => {
        const disabled = isDisabled(hour);
        const isStart = ranged ? hour === start : hour === value;
        const isEnd = ranged && hour === end;
        const inBand = ranged && start != null && bandEnd != null && hour > start && hour < bandEnd;
        let cls = "dd-hour";
        if (isStart) cls += " dd-hour--start";
        if (isEnd) cls += " dd-hour--end";
        if (inBand) cls += " dd-hour--range";
        if (hour === previewEnd) cls += " dd-hour--preview";
        return (
          <button
            key={hour}
            type="button"
            className={cls}
            disabled={disabled}
            aria-pressed={isStart || isEnd}
            onClick={() => onPick(hour)}
            onMouseEnter={() => setHover(hour)}
          >
            {formatHour(hour)}
          </button>
        );
      })}
    </div>
  );
}
