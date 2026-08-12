import { useEffect, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import GuestRow from "../../navbar/GuestRow";
import Panel from "./Panel";

/* ─── Beds dropdown — stepper panel in the same style as Area/Price.
     Stepper min 0 = "Any"; value commits on Done. ─── */

const BedCountPanel = ({
  value = 0,
  onChange, // (count) => void
  open,
  onOpenChange, // (isOpen) => void
  className = "",
}) => {
  const [draft, setDraft] = useState(value);
  const { anchorRef, panelRef, position } = useDropdownPanel(
    open,
    () => onOpenChange(false),
  );

  /* Sync draft to the committed value each time the panel opens. */
  useEffect(() => {
    if (open) setDraft(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const label = value > 0 ? `${value}+ Beds` : "Any beds";

  return (
    <div
      ref={anchorRef}
      className={`abn-s2-field ${className}${open ? " dd-field--open" : ""}`}
    >
      <button
        type="button"
        className="dd-trigger"
        onClick={() => onOpenChange(!open)}
      >
        <span
          className={`dd-trigger-value${value > 0 ? "" : " dd-trigger-placeholder"}`}
        >
          {label}
        </span>
        <FiChevronDown className="abn-s2-chev dd-chev" size={16} />
      </button>

      {open && (
        <Panel panelRef={panelRef} position={position} className="dd-beds">
          <GuestRow
            label="Bedrooms"
            sublabel="Minimum bedrooms"
            count={draft}
            onInc={() => setDraft((d) => d + 1)}
            onDec={() => setDraft((d) => Math.max(0, d - 1))}
          />
          <div className="dd-range-actions">
            <button
              type="button"
              className="dd-btn dd-btn--outline"
              onClick={() => setDraft(0)}
            >
              Reset
            </button>
            <button
              type="button"
              className="dd-btn dd-btn--solid"
              onClick={() => {
                onChange(draft);
                onOpenChange(false);
              }}
            >
              Done
            </button>
          </div>
        </Panel>
      )}
    </div>
  );
};

export default BedCountPanel;