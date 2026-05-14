import { useState } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import MonthGrid, { addMonths, formatDate } from "../navbar/MonthGrid";

/* ─── Calendar dropdown for the reservation card ─── */
const ReservationCalendar = ({ startDate, endDate, onStartChange, onEndChange, onClose }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [leftMonth, setLeft] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
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

  const handleClear = () => {
    onStartChange(null);
    onEndChange(null);
  };

  return (
    <div className="rv-cal-dropdown">
      <div className="rv-cal-header">
        <div>
          <p className="rv-cal-title">
            {!startDate ? "Select check-in date" : !endDate ? "Select checkout date" : "Your trip dates"}
          </p>
          {startDate && (
            <p className="rv-cal-subtitle">
              {formatDate(startDate)}{endDate ? ` – ${formatDate(endDate)}` : ""}
            </p>
          )}
        </div>
      </div>

      <div className="rv-cal-nav">
        <button
          className="rv-cal-nav-btn"
          onClick={() => setLeft(addMonths(leftMonth, -1))}
        >
          <FiChevronLeft size={16} />
        </button>
        <div className="rv-cal-months">
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
          className="rv-cal-nav-btn"
          onClick={() => setLeft(addMonths(leftMonth, 1))}
        >
          <FiChevronRight size={16} />
        </button>
      </div>

      <div className="rv-cal-footer">
        <button className="rv-cal-clear" onClick={handleClear}>
          Clear dates
        </button>
        <button className="rv-cal-close" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default ReservationCalendar;
