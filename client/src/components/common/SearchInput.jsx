/* ─── SearchInput — Reusable search field with icon ───
   Used in RequirementsBoard, Messages sidebar, and any filterable list.

   Props:
     value        — controlled value
     onChange     — callback(e) or callback(value) — see `rawEvent` prop
     placeholder  — input placeholder text
     className    — optional extra class on the wrapper
     rawEvent     — if true, passes the raw event; otherwise passes e.target.value
     shortcut     — when true, shows ⌘K / Ctrl+K and focuses on that key combo
   ─────────────────────────────────────────────── */

import { useEffect, useMemo, useRef } from "react";
import "../../styles/Common.css";

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  rawEvent = true,
  shortcut = false,
}) {
  const inputRef = useRef(null);

  const shortcutLabel = useMemo(() => {
    if (typeof navigator === "undefined") return "Ctrl+K";
    const platform = navigator.platform || "";
    const ua = navigator.userAgent || "";
    const isMac = /Mac|iPhone|iPad|iPod/i.test(platform) || /Mac OS X/i.test(ua);
    return isMac ? "⌘K" : "Ctrl+K";
  }, []);

  useEffect(() => {
    if (!shortcut) return undefined;
    const onKey = (e) => {
      if (!(e.key === "k" || e.key === "K")) return;
      if (!(e.metaKey || e.ctrlKey)) return;
      e.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select?.();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcut]);

  const handleChange = (e) => {
    if (rawEvent) {
      onChange(e);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <div className={`cm-search-wrap ${shortcut ? "cm-search-wrap--shortcut" : ""} ${className}`.trim()}>
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
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="M21 21l-4.35-4.35" />
      </svg>
      <input
        ref={inputRef}
        type="search"
        className="cm-search-input"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        aria-label={placeholder}
      />
      {shortcut && (
        <kbd className="cm-search-shortcut" aria-hidden="true">
          {shortcutLabel}
        </kbd>
      )}
    </div>
  );
}
