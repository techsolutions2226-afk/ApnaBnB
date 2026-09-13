import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import MonthGrid, { addMonths } from "../../navbar/MonthGrid";

/* ─── Month navigation + one or two MonthGrids for the search pickers.
     `hoverRange` previews a range while choosing the end day (Nightly);
     single-date pickers leave it off so hovering never paints a range. ─── */

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

export default function CalendarMonths({
  startDate = null,
  endDate = null,
  onDayClick,
  months = 2,
  hoverRange = false,
  isDayDisabled = null,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [leftMonth, setLeftMonth] = useState(() => monthStart(startDate || today));
  const [hoverDate, setHoverDate] = useState(null);
  const canGoBack = leftMonth > monthStart(today);

  const gridProps = {
    startDate,
    endDate,
    hoverDate: hoverRange ? hoverDate : null,
    onDayClick,
    onDayHover: hoverRange ? setHoverDate : () => {},
    today,
    isDayDisabled,
  };
  const shown = Array.from({ length: months }, (_, i) => addMonths(leftMonth, i));

  return (
    <div className="dd-dates__nav">
      <button
        type="button"
        className="dd-dates__nav-btn"
        onClick={() => setLeftMonth(addMonths(leftMonth, -1))}
        disabled={!canGoBack}
        aria-label="Previous month"
      >
        <FiChevronLeft size={16} />
      </button>
      <div
        className={`dd-dates__months${months === 1 ? " dd-dates__months--single" : ""}`}
        onMouseLeave={() => setHoverDate(null)}
      >
        {shown.map((m) => (
          <MonthGrid
            key={`${m.getFullYear()}-${m.getMonth()}`}
            year={m.getFullYear()}
            month={m.getMonth()}
            {...gridProps}
          />
        ))}
      </div>
      <button
        type="button"
        className="dd-dates__nav-btn"
        onClick={() => setLeftMonth(addMonths(leftMonth, 1))}
        aria-label="Next month"
      >
        <FiChevronRight size={16} />
      </button>
    </div>
  );
}
