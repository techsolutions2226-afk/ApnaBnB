import { FiChevronDown } from "react-icons/fi";
import useDropdownPanel from "../../../hooks/useDropdownPanel";
import Panel from "./Panel";

/* ─── Tabbed 2-column grid dropdown (Property Type field).
     Tabs: Homes | Plots | Commercial. Switching a tab selects that tab's
     "All" option (value "") so the field label always matches the value. ─── */

const TabbedGrid = ({
  tabs = [], // [{ id, label, icon, options: [{ value, label, icon }] }]
  value,
  activeTab,
  onTabChange, // (tabId) => void
  onChange, // (value, tabId) => void
  open,
  onOpenChange, // (isOpen) => void
  className = "",
}) => {
  const { anchorRef, panelRef, position } = useDropdownPanel(
    open,
    () => onOpenChange(false),
  );

  const currentTab =
    tabs.find((t) => t.id === activeTab) || tabs[0] || null;
  const currentOptions = currentTab?.options || [];
  /* A concrete option shows its own name in the field ("Upper Portion");
     the empty "All …" option falls back to the tab label ("Homes"). */
  const selectedOption =
    value !== "" ? currentOptions.find((o) => o.value === value) : undefined;
  const fieldLabel = selectedOption ? selectedOption.label : currentTab?.label || "Homes";

  const handleSelect = (option) => {
    onChange(option.value, currentTab.id);
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
        <span className="dd-trigger-value">{fieldLabel}</span>
        <FiChevronDown className="abn-s2-chev dd-chev" size={16} />
      </button>

      {open && (
        <Panel panelRef={panelRef} position={position} className="dd-tg">
          {/* Tabs */}
          <div className="dd-tabs">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`dd-tab${t.id === currentTab?.id ? " dd-tab--active" : ""}`}
                onClick={() => {
                  onTabChange(t.id);
                  onChange("", t.id);
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 2-column option grid */}
          <div className="dd-tg-grid">
            {currentOptions.map((opt) => {
              const OptIcon = opt.icon;
              const active = opt.value === value;
              return (
                <button
                  key={`${currentTab.id}-${opt.value}-${opt.label}`}
                  type="button"
                  className={`dd-card${active ? " dd-card--active" : ""}`}
                  onClick={() => handleSelect(opt)}
                >
                  {OptIcon && (
                    <span className="dd-card-icon">
                      <OptIcon size={16} />
                    </span>
                  )}
                  <span className="dd-card-label">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </Panel>
      )}
    </div>
  );
};

export default TabbedGrid;