import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import MonthGrid, { addMonths } from "./MonthGrid";

/* ─── Calendar Dropdown — receives state from parent ─── */
function CalendarDropdown({
  startDate,
  endDate,
  onStartChange,
  onEndChange,
  onClear,
}) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [view, setView] = useState("Dates");
  const [leftMonth, setLeft] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [hoverDate, setHover] = useState(null);
  const rightMonth = addMonths(leftMonth, 1);

  const handleDay = (date) => {
    if (!startDate || (startDate && endDate)) {
      onStartChange(date);
      onEndChange(null);
    } else {
      if (date < startDate) {
        onStartChange(date);
        onEndChange(null);
      } else {
        onEndChange(date);
      }
    }
  };

  return (
    <div className="cal-dropdown">
      <div className="cal-tabs">
        <button
          className={`cal-tab ${view === "Dates" ? "cal-tab--active" : ""}`}
          onClick={() => setView("Dates")}
        >
          Dates
        </button>
        <button
          className={`cal-tab ${view === "Flexible" ? "cal-tab--active" : ""}`}
          onClick={() => setView("Flexible")}
        >
          Flexible
        </button>
      </div>

      {view === "Flexible" ? (
        <div className="cal-flexible">
          <p>Flexible dates coming soon</p>
        </div>
      ) : (
        <>
          <div className="cal-nav">
            <button
              className="cal-nav-btn"
              onClick={() => setLeft(addMonths(leftMonth, -1))}
            >
              <FiChevronLeft size={18} />
            </button>
            <div className="cal-months-row">
              <MonthGrid
                year={leftMonth.getFullYear()}
                month={leftMonth.getMonth()}
                startDate={startDate}
                endDate={endDate}
                hoverDate={hoverDate}
                onDayClick={handleDay}
                onDayHover={setHover}
                today={today}
              />
              <MonthGrid
                year={rightMonth.getFullYear()}
                month={rightMonth.getMonth()}
                startDate={startDate}
                endDate={endDate}
                hoverDate={hoverDate}
                onDayClick={handleDay}
                onDayHover={setHover}
                today={today}
              />
            </div>
            <button
              className="cal-nav-btn"
              onClick={() => setLeft(addMonths(leftMonth, 1))}
            >
              <FiChevronRight size={18} />
            </button>
          </div>

          {(startDate || endDate) && (
            <div className="cal-footer">
              <button className="cal-clear-btn" onClick={onClear}>
                Clear dates
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default CalendarDropdown;
