import { motion, useReducedMotion } from "framer-motion";
import { FiClock, FiMoon, FiCalendar, FiHome } from "react-icons/fi";
import { STAY_PERIODS } from "../../../config/stayPeriods";

/* ─── Hourly / Nightly / Monthly / Yearly chooser.
     variant="cards": the first step — a period must be chosen before any
     calendar is shown. variant="tabs": compact switcher above the calendar. ─── */

const ICONS = { hourly: FiClock, nightly: FiMoon, monthly: FiCalendar, yearly: FiHome };

export default function StayPeriodPicker({ variant = "tabs", value, onChange }) {
  const reduce = useReducedMotion();

  if (variant === "cards") {
    return (
      <div className="dd-stay__cards" role="group" aria-label="Rental period">
        {STAY_PERIODS.map((p, i) => {
          const Icon = ICONS[p.id];
          return (
            <motion.button
              key={p.id}
              type="button"
              className="dd-stay__card"
              onClick={() => onChange(p.id)}
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22, delay: reduce ? 0 : i * 0.04 }}
            >
              <span className="dd-stay__card-icon">
                <Icon size={17} />
              </span>
              <span className="dd-stay__card-label">{p.label}</span>
              <span className="dd-stay__card-hint">{p.hint}</span>
            </motion.button>
          );
        })}
      </div>
    );
  }

  return (
    <div className="dd-stay__tabs" role="tablist" aria-label="Rental period">
      {STAY_PERIODS.map((p) => {
        const active = p.id === value;
        return (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`dd-stay__tab${active ? " dd-stay__tab--active" : ""}`}
            onClick={() => onChange(p.id)}
          >
            {active && (
              <motion.span
                layoutId="stay-period-pill"
                className="dd-stay__tab-pill"
                transition={
                  reduce ? { duration: 0 } : { type: "spring", stiffness: 480, damping: 36 }
                }
              />
            )}
            <span className="dd-stay__tab-label">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}
