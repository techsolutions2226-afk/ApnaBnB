import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import GuestRow from "../../navbar/GuestRow";
import { fromDateKey, formatDateLong, toDateKey } from "../../../utils/dateRange";
import {
  getStayPeriod,
  selectStayPeriod,
  selectStayDay,
  setStayDuration,
  setStayStartHour,
  clearStayDates,
  formatStay,
  formatDuration,
} from "../../../utils/stay";
import Panel from "./Panel";
import StackedTrigger from "./StackedTrigger";
import StayPeriodPicker from "./StayPeriodPicker";
import CalendarMonths from "./CalendarMonths";
import HourPicker from "./HourPicker";
import "../../../styles/StayPicker.css";

/* ─── Tenant "When": choose a rental period first, then the calendar that
     fits it. Nightly → check-in/check-out range; Hourly → day + start time +
     hours; Monthly / Yearly → move-in day + months / years (end derived).
     All state changes go through utils/stay. ─── */

const EASE = [0.22, 1, 0.36, 1];
const PHONE = "(max-width: 640px)";
const PANEL_ROOM = 560; // px the tallest (Hourly) layout needs below the bar

function heading(stay) {
  if (!stay.period) return ["How long are you staying?", "Choose a rental period to see its calendar"];
  const start = fromDateKey(stay.checkIn);
  if (stay.period === "nightly") {
    if (!start) return ["Select check-in date", "Then pick your check-out date"];
    if (!stay.checkOut) return ["Select check-out date", formatStay(stay)];
    return ["Your dates", formatStay(stay)];
  }
  if (stay.period === "hourly") {
    if (!start) return ["Pick a day", "Then choose a start time and hours"];
    if (stay.startHour == null) return ["Pick a start time", formatDateLong(start)];
    return ["Your booking", formatStay(stay)];
  }
  if (!start) return ["Select move-in date", `Then set how many ${getStayPeriod(stay.period).duration.unit}s`];
  return [
    "Your stay",
    `${formatDateLong(start)} → ${formatDateLong(fromDateKey(stay.checkOut))}`,
  ];
}

export default function StayPanel({
  label = "When",
  placeholder = "Add dates",
  stay,
  onChange, // (stay) => void
  open,
  onOpenChange, // (isOpen) => void
  activeLayoutId,
  className = "",
}) {
  const reduce = useReducedMotion();
  const { anchorRef, panelRef, position } = useDropdownPanel(open, () => onOpenChange(false));
  const period = getStayPeriod(stay.period);

  /* When the calendar wouldn't fit below the bar (phones, or a desktop hero
     sitting low on screen), bring the bar up under the header first. */
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!open || !anchor) return;
    const room = window.innerHeight - anchor.getBoundingClientRect().bottom;
    if (room < PANEL_ROOM || window.matchMedia(PHONE).matches) {
      anchor.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [open, anchorRef, reduce]);

  const handleDay = (date) => {
    let next = selectStayDay(stay, date);
    // A start hour that has already passed today is no longer valid.
    const now = new Date();
    if (
      next.period === "hourly" &&
      next.startHour != null &&
      next.checkIn === toDateKey(now) &&
      next.startHour <= now.getHours()
    ) {
      next = setStayStartHour(next, null);
    }
    onChange(next);
  };

  const [title, subtitle] = heading(stay);
  const start = fromDateKey(stay.checkIn);
  const end = fromDateKey(stay.checkOut);
  const panelStyle = position
    ? { ...position, maxHeight: Math.max(240, window.innerHeight - position.top - 12) }
    : undefined;

  return (
    <div ref={anchorRef} className={`abn-s2-field ${className}${open ? " dd-field--open" : ""}`}>
      <StackedTrigger
        label={label}
        value={formatStay(stay) || period?.label || ""}
        placeholder={placeholder}
        open={open}
        onClick={() => onOpenChange(!open)}
        activeLayoutId={activeLayoutId}
      />

      <AnimatePresence>
        {open && (
          <Panel key="stay" panelRef={panelRef} position={panelStyle} className="dd-dates dd-stay" animated>
            {period && (
              <StayPeriodPicker value={period.id} onChange={(id) => onChange(selectStayPeriod(stay, id))} />
            )}

            <div className="dd-stay__head">
              <h4 className="dd-beds-title">{title}</h4>
              <p className="dd-beds-sub">{subtitle}</p>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={period?.id || "choose"}
                initial={reduce ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduce ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.18, ease: EASE }}
              >
                {!period && (
                  <StayPeriodPicker variant="cards" onChange={(id) => onChange(selectStayPeriod(stay, id))} />
                )}

                {period?.id === "nightly" && (
                  <CalendarMonths startDate={start} endDate={end} onDayClick={handleDay} months={2} hoverRange />
                )}

                {period?.duration && (
                  <div className="dd-stay__split">
                    <CalendarMonths
                      startDate={start}
                      endDate={end}
                      onDayClick={handleDay}
                      months={1}
                    />
                    <div className="dd-stay__side">
                      {period.id === "hourly" && (
                        <div>
                          <p className="dd-stay__side-title">Start time</p>
                          <HourPicker
                            value={stay.startHour}
                            dateKey={stay.checkIn}
                            onChange={(hour) => onChange(setStayStartHour(stay, hour))}
                          />
                        </div>
                      )}
                      <GuestRow
                        label={`${period.duration.unit[0].toUpperCase()}${period.duration.unit.slice(1)}s`}
                        sublabel={`${period.duration.min}–${period.duration.max} ${period.duration.unit}s`}
                        count={stay.duration}
                        minVal={period.duration.min}
                        onInc={() => onChange(setStayDuration(stay, stay.duration + 1))}
                        onDec={() => onChange(setStayDuration(stay, stay.duration - 1))}
                      />
                      <AnimatePresence initial={false}>
                        {formatStay(stay) && (
                          <motion.p
                            key="summary"
                            className="dd-stay__summary"
                            initial={reduce ? false : { opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={reduce ? undefined : { opacity: 0, height: 0 }}
                          >
                            {period.id === "hourly"
                              ? formatStay(stay)
                              : `${formatDuration(stay.period, stay.duration)} · until ${formatDateLong(end)}`}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {period && (
              <div className="dd-range-actions">
                <button type="button" className="dd-btn dd-btn--outline" onClick={() => onChange(clearStayDates(stay))}>
                  Clear dates
                </button>
                <button type="button" className="dd-btn dd-btn--solid" onClick={() => onOpenChange(false)}>
                  Done
                </button>
              </div>
            )}
          </Panel>
        )}
      </AnimatePresence>
    </div>
  );
}
