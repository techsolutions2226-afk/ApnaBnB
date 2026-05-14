/* ─── FilterTabs — Horizontal tab/filter bar ───
   A row of pill-shaped buttons for filtering content.
   Used in MyListings, RequirementsBoard, Matches, AdminDashboard.

   Props:
     tabs       — array of { key, label } or { key, label, count }
     activeKey  — currently selected tab key
     onChange   — callback(key) when a tab is clicked
     prefix     — CSS class prefix (default "cm-tab")
     showCounts — show count next to label (default false)
     className  — optional extra class on the wrapper
   ─────────────────────────────────────────────── */

import "../../styles/Common.css";

export default function FilterTabs({
  tabs = [],
  activeKey,
  onChange,
  prefix = "cm-tab",
  showCounts = false,
  className = "",
}) {
  return (
    <div className={`${prefix}-group ${className}`.trim()}>
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          className={`${prefix}${activeKey === tab.key ? ` ${prefix}--active` : ""}`}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {showCounts && tab.count != null && ` (${tab.count})`}
        </button>
      ))}
    </div>
  );
}
