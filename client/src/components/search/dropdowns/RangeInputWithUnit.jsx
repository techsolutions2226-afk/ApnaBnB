import { useEffect, useRef, useState } from "react";
import { FiChevronDown, FiCheck } from "react-icons/fi";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import Modal from "../../common/Modal";
import Panel from "./Panel";

/* ─── Range (min/max) dropdown with a unit / currency picker modal.
     Shared by the Area and Price fields:
     - draft min/max inputs; values only commit on "Done" (closes + applies).
     - "Reset" clears the drafts, keeps the panel open.
     - Optional `suggestions` renders an autocomplete list under the focused
       input (used by Price).
     - "Change …" opens a modal to swap the unit/currency — label-only, no
       numeric conversion so the PKR/Marla value sent to the backend is
       untouched. ─── */

const RangeInputWithUnit = ({
  title = "Range",
  unit,
  changeLabel = "Unit",
  modalTitle = "Change Unit",
  unitOptions = [], // [{ value, label }]
  min = "",
  max = "",
  onChange, // ({ min, max }) => void
  onUnitChange, // (unitValue) => void
  suggestions = null, // [number] | null
  open,
  onOpenChange, // (isOpen) => void
  className = "",
}) => {
  const [draftMin, setDraftMin] = useState(min);
  const [draftMax, setDraftMax] = useState(max);
  const [focused, setFocused] = useState(null); // "min" | "max" | null
  const [unitModalOpen, setUnitModalOpen] = useState(false);
  const blurTimerRef = useRef(null);
  const { anchorRef, panelRef, position } = useDropdownPanel(
    open,
    () => onOpenChange(false),
  );

  /* Delayed close keeps the suggestion list open long enough for a click to
     register after the input blurs. The timer is cleared whenever another
     field is focused, so a stale min-blur can never close the max list. */
  const scheduleBlurClose = () => {
    clearTimeout(blurTimerRef.current);
    blurTimerRef.current = setTimeout(() => setFocused(null), 120);
  };

  const focusField = (which) => {
    clearTimeout(blurTimerRef.current);
    setFocused(which);
  };

  /* Sync drafts to the committed values each time the panel opens. */
  useEffect(() => {
    if (open) {
      setDraftMin(min);
      setDraftMax(max);
      setFocused(null);
    }
    return () => clearTimeout(blurTimerRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const formatNum = (v) => (v === "" || v == null ? "" : Number(v).toLocaleString("en-US"));

  const committedLabel = `${title} (${unit})${
    min !== "" || max !== ""
      ? ` · ${[min && formatNum(min), max && formatNum(max)].filter(Boolean).join(" – ")}`
      : ""
  }`;

  const showSuggestions = !!suggestions;
  const activeSuggestTarget =
    showSuggestions &&
    (focused === "max" || focused === "min") &&
    open;

  const pickSuggestion = (e, raw) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (focused === "min") setDraftMin(raw);
    else setDraftMax(raw);
    // Commit the picked value immediately so the field label shows the price
    // right away — selecting a price must never wait for "Done".
    onChange(
      focused === "min"
        ? { min: raw, max: draftMax }
        : { min: draftMin, max: raw },
    );
    // Close only the suggestion list — the panel (and its Reset/Done row)
    // stays open underneath. Clear any pending close so focus on the other
    // field isn't affected.
    clearTimeout(blurTimerRef.current);
    setFocused(null);
  };

  const handleReset = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    setDraftMin("");
    setDraftMax("");
  };

  const handleDone = (e) => {
    e?.preventDefault();
    e?.stopPropagation();
    onChange({ min: draftMin, max: draftMax });
    onOpenChange(false);
  };

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
        <span className="dd-trigger-value">{committedLabel}</span>
        <FiChevronDown className="abn-s2-chev dd-chev" size={16} />
      </button>

      {open && (
        <Panel panelRef={panelRef} position={position} className="dd-range">
          <div className="dd-range-head">
            <h4 className="dd-range-title">{committedLabel}</h4>
            <button
              type="button"
              className="dd-change-link"
              onClick={() => setUnitModalOpen(true)}
            >
              Change {changeLabel}
            </button>
          </div>

          <div className="dd-range-inputs">
            <div className="dd-range-field">
              <label className="dd-range-label" htmlFor={`dd-min-${title}`}>
                Minimum
              </label>
              <input
                id={`dd-min-${title}`}
                className="dd-range-input"
                type="text"
                inputMode="numeric"
                placeholder="0"
                value={draftMin}
                onChange={(e) => setDraftMin(e.target.value)}
                onFocus={() => focusField("min")}
                onBlur={scheduleBlurClose}
              />
              {activeSuggestTarget && focused === "min" && (
                <SuggestionList
                  suggestions={suggestions}
                  onPick={pickSuggestion}
                />
              )}
            </div>

            <div className="dd-range-field">
              <label className="dd-range-label" htmlFor={`dd-max-${title}`}>
                Maximum
              </label>
              <input
                id={`dd-max-${title}`}
                className="dd-range-input"
                type="text"
                inputMode="numeric"
                placeholder="Any"
                value={draftMax}
                onChange={(e) => setDraftMax(e.target.value)}
                onFocus={() => focusField("max")}
                onBlur={scheduleBlurClose}
              />
              {activeSuggestTarget && focused === "max" && (
                <SuggestionList
                  suggestions={suggestions}
                  onPick={pickSuggestion}
                />
              )}
            </div>
          </div>

          <div className="dd-range-actions">
            <button
              type="button"
              className="dd-btn dd-btn--outline"
              onClick={handleReset}
            >
              Reset
            </button>
            <button
              type="button"
              className="dd-btn dd-btn--solid"
              onClick={handleDone}
            >
              Done
            </button>
          </div>
        </Panel>
      )}

      {/* Unit / currency picker modal */}
      <Modal
        isOpen={unitModalOpen}
        onClose={() => setUnitModalOpen(false)}
        title={modalTitle}
        size="small"
      >
        <div className="dd-modal-list">
          {unitOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`dd-opt${opt.value === unit ? " dd-opt--active" : ""}`}
              onClick={() => {
                onUnitChange(opt.value);
                setUnitModalOpen(false);
              }}
            >
              <span className="dd-opt-label">{opt.label}</span>
              {opt.value === unit && (
                <FiCheck className="dd-opt-check" size={16} />
              )}
            </button>
          ))}
        </div>
      </Modal>
    </div>
  );
};

/* Preset autocomplete list — clears the input when "Any" is picked.
   preventDefault on mousedown keeps the input focused while the user is
   interacting with the list, so the blur-close can't unmount the list before
   the click registers (which would swallow the selection). The list is then
   closed explicitly by pickSuggestion. */
const SuggestionList = ({ suggestions = [], onPick }) => (
  <ul className="dd-suggest" onMouseDown={(e) => e.preventDefault()}>
    <li>
      <button type="button" onClick={(e) => onPick(e, "")}>
        Any
      </button>
    </li>
    {suggestions.map((v) => (
      <li key={v}>
        <button type="button" onClick={(e) => onPick(e, String(v))}>
          {Number(v).toLocaleString("en-US")}
        </button>
      </li>
    ))}
  </ul>
);

export default RangeInputWithUnit;