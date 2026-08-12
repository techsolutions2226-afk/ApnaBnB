import { useState } from "react";
import { FiChevronDown, FiSearch } from "react-icons/fi";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import Panel from "./Panel";

/* ─── Click-to-open searchable list dropdown.
     Used for the City field. The trigger keeps the .abn-s2-field look while
     the panel floats above the page via fixed positioning. ─── */

const SearchableList = ({
  options = [], // [{ value, label }]
  value,
  onChange, // (value) => void  — commits on select + closes
  placeholder = "Select",
  icon: Icon = null,
  open,
  onOpenChange, // (isOpen) => void
  className = "",
}) => {
  const [query, setQuery] = useState("");
  const { anchorRef, panelRef, position } = useDropdownPanel(
    open,
    () => onOpenChange(false),
  );

  const toggle = () => {
    if (!open) setQuery(""); // reset the filter each time the panel opens
    onOpenChange(!open);
  };

  const active = options.find((o) => o.value === value);
  const filtered = options.filter((o) =>
    String(o.label).toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div
      ref={anchorRef}
      className={`abn-s2-field abn-s2-city ${className}${open ? " dd-field--open" : ""}`}
    >
      <button
        type="button"
        className="dd-trigger"
        onClick={toggle}
      >
        {Icon && <Icon className="abn-s2-ico" size={16} />}
        <span
          className={`dd-trigger-value${active ? "" : " dd-trigger-placeholder"}`}
        >
          {active ? active.label : placeholder}
        </span>
        <FiChevronDown className="abn-s2-chev dd-chev" size={16} />
      </button>

      {open && (
        <Panel panelRef={panelRef} position={position} className="dd-sl">
          <div className="dd-search">
            <FiSearch size={14} className="dd-search-ico" />
            <input
              autoFocus
              className="dd-search-input"
              placeholder="Search cities"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="dd-list">
            {filtered.length === 0 ? (
              <div className="dd-empty">No matching cities</div>
            ) : (
              filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  className={`dd-item${o.value === value ? " dd-item--active" : ""}`}
                  onClick={() => {
                    onChange(o.value);
                    onOpenChange(false);
                  }}
                >
                  {o.label}
                </button>
              ))
            )}
          </div>
        </Panel>
      )}
    </div>
  );
};

export default SearchableList;