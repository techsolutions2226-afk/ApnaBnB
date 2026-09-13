import { AnimatePresence } from "framer-motion";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import GuestRow from "../../navbar/GuestRow";
import Panel from "./Panel";
import StackedTrigger from "./StackedTrigger";

/* ─── Guest counter for the Tenant "Who" section.
     Reuses the shared GuestRow (− count +). Updates live. ─── */

const MAX_GUESTS = 16;

const formatGuests = (count) =>
  count > 0 ? `${count} guest${count === 1 ? "" : "s"}` : "";

const GuestCountPanel = ({
  label = "Who",
  placeholder = "Add guests",
  value = 0,
  onChange, // (count) => void
  open,
  onOpenChange, // (isOpen) => void
  activeLayoutId,
  className = "",
}) => {
  const { anchorRef, panelRef, position } = useDropdownPanel(
    open,
    () => onOpenChange(false),
  );

  return (
    <div
      ref={anchorRef}
      className={`abn-s2-field ${className}${open ? " dd-field--open" : ""}`}
    >
      <StackedTrigger
        label={label}
        value={formatGuests(value)}
        placeholder={placeholder}
        open={open}
        onClick={() => onOpenChange(!open)}
        activeLayoutId={activeLayoutId}
      />

      <AnimatePresence>
        {open && (
          <Panel
            key="guests"
            panelRef={panelRef}
            position={position}
            className="dd-guests"
            animated
          >
            <h4 className="dd-beds-title">Guests</h4>
            <p className="dd-beds-sub">How many people will live here?</p>

            <GuestRow
              label="Guests"
              sublabel={`Up to ${MAX_GUESTS}`}
              count={value}
              onInc={() => value < MAX_GUESTS && onChange(value + 1)}
              onDec={() => onChange(Math.max(0, value - 1))}
            />

            <div className="dd-range-actions">
              <button
                type="button"
                className="dd-btn dd-btn--outline"
                onClick={() => onChange(0)}
              >
                Clear
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

export default GuestCountPanel;
