/* ─── SearchInput — Reusable search field with icon ───
   Used in RequirementsBoard, Messages sidebar, and any filterable list.

   Props:
     value        — controlled value
     onChange     — callback(e) or callback(value) — see `rawEvent` prop
     placeholder  — input placeholder text
     className    — optional extra class on the wrapper
     rawEvent     — if true, passes the raw event; otherwise passes e.target.value
   ─────────────────────────────────────────────── */

import "../../styles/Common.css";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  rawEvent = true,
}) {
  const handleChange = (e) => {
    if (rawEvent) {
      onChange(e);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`cm-search-wrap ${className}`.trim()}>
      <svg
        className="cm-search-icon"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        type="text"
        className="cm-search-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
      />
    </div>
  );
}
