import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import { getStayPeriod, selectStayPeriod, clearStayDates, formatStay } from "../../../utils/stay";
import Panel from "./Panel";
import StackedTrigger from "./StackedTrigger";
import StayPeriodPicker from "./StayPeriodPicker";
import StayPeriodBody from "./StayPeriodBody";
import stayHeading from "./stayHeading";
import "../../../styles/StayPicker.css";

/* ─── Tenant "When": choose a rental period first, then the picker that fits
     it (StayPeriodBody). All state changes go through utils/stay. ─── */

const EASE = [0.22, 1, 0.36, 1];
const PHONE = "(max-width: 640px)";
const PANEL_ROOM = 660; // px the tallest (Few nights) layout needs below the bar

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

  /* When the picker wouldn't fit below the bar (phones, or a desktop hero
     sitting low on screen), bring the bar up under the header first. */
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!open || !anchor) return;
    const room = window.innerHeight - anchor.getBoundingClientRect().bottom;
    if (room < PANEL_ROOM || window.matchMedia(PHONE).matches) {
      anchor.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
    }
  }, [open, anchorRef, reduce]);

  const pickPeriod = (id) => onChange(selectStayPeriod(stay, id));
  const [title, subtitle] = stayHeading(stay);
  const panelStyle = position
    ? { ...position, maxHeight: Math.max(240, window.innerHeight - position.top - 12) }
    : undefined;

  return (
    <div ref={anchorRef} className={`abn-s2-field ${className}${open ? " dd-field--open" : ""}`}>
      <StackedTrigger
        label={label}
        value={formatStay(stay, { compact: true }) || period?.label || ""}
        placeholder={placeholder}
        open={open}
        onClick={() => onOpenChange(!open)}
        activeLayoutId={activeLayoutId}
      />

      <AnimatePresence>
        {open && (
          <Panel key="stay" panelRef={panelRef} position={panelStyle} className="dd-dates dd-stay" animated>
            {period && <StayPeriodPicker value={period.id} onChange={pickPeriod} />}

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
                {period ? (
                  <StayPeriodBody stay={stay} onChange={onChange} />
                ) : (
                  <StayPeriodPicker variant="cards" onChange={pickPeriod} />
                )}
              </motion.div>
            </AnimatePresence>

            {period && (
              <div className="dd-range-actions">
                <button type="button" className="dd-btn dd-btn--outline" onClick={() => onChange(clearStayDates(stay))}>
                  Clear
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
