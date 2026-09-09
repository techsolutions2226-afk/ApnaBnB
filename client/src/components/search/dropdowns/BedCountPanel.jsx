import { useEffect, useState } from "react";
import { FiChevronDown } from "react-icons/fi";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import Panel from "./Panel";

/* ─── Beds dropdown — chip picker (Any / 1+ / 2+ …) instead of a
     bare − 0 + stepper. Value commits on Done. ─── */

const BED_OPTIONS = [
  { value: 0, label: "Any" },
  { value: 1, label: "1+" },
  { value: 2, label: "2+" },
  { value: 3, label: "3+" },
  { value: 4, label: "4+" },
  { value: 5, label: "5+" },
];

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
          <h4 className="dd-beds-title">Bedrooms</h4>
          <p className="dd-beds-sub">Minimum number of bedrooms</p>

          <div className="dd-beds-chips" role="group" aria-label="Minimum bedrooms">
            {BED_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`dd-beds-chip${
                  draft === opt.value ? " dd-beds-chip--active" : ""
                }`}
                aria-pressed={draft === opt.value}
                onClick={() => setDraft(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>

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
