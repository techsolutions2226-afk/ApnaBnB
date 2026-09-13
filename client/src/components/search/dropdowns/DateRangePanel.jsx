import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import MonthGrid, { addMonths, formatDateRange } from "../../navbar/MonthGrid";
import { nextDateRange, toDateKey, fromDateKey } from "../../../utils/dateRange";
import Panel from "./Panel";
import StackedTrigger from "./StackedTrigger";

/* ─── Check-in / check-out picker for the Tenant "When" section.
     Reuses the shared MonthGrid and the shared range rule; values travel as
     "YYYY-MM-DD" keys so they drop straight into the search URL.
     Two months side by side on desktop, one on phones (CSS hides the second). ─── */

const monthStart = (date) => new Date(date.getFullYear(), date.getMonth(), 1);

const DateRangePanel = ({
  label = "When",
  placeholder = "Add dates",
  checkIn = "", // "YYYY-MM-DD" | ""
  checkOut = "",
  onChange, // ({ checkIn, checkOut }) => void — live, on every day click
  open,
  onOpenChange, // (isOpen) => void
  activeLayoutId,
  className = "",
}) => {
  const { anchorRef, panelRef, position } = useDropdownPanel(
    open,
    () => onOpenChange(false),
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = fromDateKey(checkIn);
  const end = fromDateKey(checkOut);

  const [leftMonth, setLeftMonth] = useState(() => monthStart(start || today));
  const [hoverDate, setHoverDate] = useState(null);
  const rightMonth = addMonths(leftMonth, 1);
  const canGoBack = leftMonth > monthStart(today);

  const handleDay = (date) => {
    const range = nextDateRange(start, end, date);
    onChange({ checkIn: toDateKey(range.start), checkOut: toDateKey(range.end) });
  };

  const title = !start
    ? "Select move-in date"
    : !end
      ? "Select move-out date"
      : "Your dates";

  const gridProps = {
    startDate: start,
    endDate: end,
    hoverDate,
    onDayClick: handleDay,
    onDayHover: setHoverDate,
    today,
  };

  return (
    <div
      ref={anchorRef}
      className={`abn-s2-field ${className}${open ? " dd-field--open" : ""}`}
    >
      <StackedTrigger
        label={label}
        value={formatDateRange(start, end)}
        placeholder={placeholder}
        open={open}
        onClick={() => onOpenChange(!open)}
        activeLayoutId={activeLayoutId}
      />

      <AnimatePresence>
        {open && (
          <Panel
            key="dates"
            panelRef={panelRef}
            position={position}
            className="dd-dates"
            animated
          >
            <div className="dd-dates__head">
              <h4 className="dd-beds-title">{title}</h4>
              <p className="dd-beds-sub">
                {start ? formatDateRange(start, end) : "Choose when you'd like to move in"}
              </p>
            </div>

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
              <div className="dd-dates__months" onMouseLeave={() => setHoverDate(null)}>
                <MonthGrid
                  year={leftMonth.getFullYear()}
                  month={leftMonth.getMonth()}
                  {...gridProps}
                />
                <MonthGrid
                  year={rightMonth.getFullYear()}
                  month={rightMonth.getMonth()}
                  {...gridProps}
                />
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

            <div className="dd-range-actions">
              <button
                type="button"
                className="dd-btn dd-btn--outline"
                onClick={() => onChange({ checkIn: "", checkOut: "" })}
              >
                Clear dates
              </button>
              <button
                type="button"
                className="dd-btn dd-btn--solid"
                onClick={() => onOpenChange(false)}
              >
                Done
              </button>
            </div>
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DateRangePanel;
