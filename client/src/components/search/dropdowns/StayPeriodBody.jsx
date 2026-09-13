import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { FiInfo } from "react-icons/fi";
import GuestRow from "../../navbar/GuestRow";
import { CHECK_TIME_HOURS, HOURLY_HOURS } from "../../../config/stayPeriods";
import { fromDateKey, formatDate, formatDateLong } from "../../../utils/dateRange";
import {
  getStayPeriod,
  selectStayDay,
  selectStayHour,
  setStayTime,
  setStayDuration,
  formatStay,
  formatDuration,
  isPastHour,
  isStayDayDisabled,
  plural,
  stayHours,
} from "../../../utils/stay";
import CalendarMonths from "./CalendarMonths";
import HourPicker from "./HourPicker";
import CountPicker from "./CountPicker";

/* ─── The picker for the chosen rental period (config/stayPeriods):
     Hourly   one-month calendar + start → end hour range
     Nightly  two-month check-in / check-out range (click a date twice for one
              night; days past 29 nights are blocked) + optional times
     Monthly  one-month calendar + months stepper
     Yearly   number buttons 1–5, no calendar ─── */

const capitalize = (s) => `${s[0].toUpperCase()}${s.slice(1)}`;

function Summary({ text }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence initial={false}>
      {text && (
        <motion.p
          key="summary"
          className="dd-stay__summary"
          initial={reduce ? false : { opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={reduce ? undefined : { opacity: 0, height: 0 }}
        >
          {text}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export default function StayPeriodBody({ stay, onChange }) {
  const def = getStayPeriod(stay.period);
  const start = fromDateKey(stay.checkIn);
  const end = fromDateKey(stay.checkOut);
  const onDay = (date) => onChange(selectStayDay(stay, date));

  if (!def.dates) {
    return (
      <div className="dd-stay__count">
        <CountPicker
          min={def.count.min}
          max={def.count.max}
          value={stay.duration}
          unit={def.count.unit}
          label={`Number of ${def.count.unit}s`}
          onPick={(n) => onChange(setStayDuration(stay, n))}
        />
        <Summary text={stay.duration ? `This home for ${formatDuration(stay.period, stay.duration)}` : ""} />
      </div>
    );
  }

  if (def.dates === "range") {
    return (
      <>
        <CalendarMonths
          startDate={start}
          endDate={end}
          onDayClick={onDay}
          months={2}
          hoverRange
          isDayDisabled={(date) => isStayDayDisabled(stay, date)}
        />
        {def.nights && (
          <p className="dd-stay__cal-hint">
            <FiInfo size={13} aria-hidden="true" />
            Click a date twice for 1 night · up to {def.nights.max} nights
          </p>
        )}
        {def.times === "checkInOut" && (
          <div className="dd-stay__times">
            <div>
              <p className="dd-stay__side-title">
                Check-in time{start ? ` · ${formatDate(start)}` : ""}
              </p>
              <HourPicker
                hours={CHECK_TIME_HOURS}
                value={stay.startHour}
                label="Check-in time"
                isDisabled={(h) => !start || isPastHour(stay.checkIn, h)}
                onPick={(h) => onChange(setStayTime(stay, "startHour", h))}
              />
            </div>
            <div>
              <p className="dd-stay__side-title">
                Check-out time{end ? ` · ${formatDate(end)}` : ""}
              </p>
              <HourPicker
                hours={CHECK_TIME_HOURS}
                value={stay.endHour}
                label="Check-out time"
                isDisabled={() => !end}
                onPick={(h) => onChange(setStayTime(stay, "endHour", h))}
              />
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="dd-stay__split">
      <CalendarMonths startDate={start} endDate={end} onDayClick={onDay} months={1} />
      <div className="dd-stay__side">
        {def.times === "range" && (
          <>
            <div>
              <p className="dd-stay__side-title">Time</p>
              <p className="dd-stay__side-hint">Tap a start time, then an end time</p>
              <HourPicker
                hours={HOURLY_HOURS}
                mode="range"
                start={stay.startHour}
                end={stay.endHour}
                label="Booking hours"
                isDisabled={(h) => !start || isPastHour(stay.checkIn, h)}
                onPick={(h) => onChange(selectStayHour(stay, h))}
              />
            </div>
            <Summary text={stayHours(stay) ? `${plural(stayHours(stay), "hour")} · ${formatStay(stay)}` : ""} />
          </>
        )}

        {def.count && (
          <>
            <GuestRow
              label={`${capitalize(def.count.unit)}s`}
              sublabel={`${def.count.min}–${def.count.max} ${def.count.unit}s`}
              count={stay.duration}
              minVal={def.count.min}
              onInc={() => onChange(setStayDuration(stay, stay.duration + 1))}
              onDec={() => onChange(setStayDuration(stay, stay.duration - 1))}
            />
            <Summary
              text={
                start
                  ? `${formatDuration(stay.period, stay.duration)} · until ${formatDateLong(end)}`
                  : ""
              }
            />
          </>
        )}
      </div>
    </div>
  );
}
